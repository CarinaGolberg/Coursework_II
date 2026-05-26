"""
Формы для бронирования тура.
"""

from datetime import date

from django import forms
from django.db.models import Sum

from .models import (
    Booking,
    ConsentDocument,
    Tour,
    TourSchedule
)


class BookingForm(forms.ModelForm):
    """Форма для бронирования тура с выбором расписания"""

    tour = forms.ModelChoiceField(
        queryset=Tour.objects.none(),
        label='Выберите тур',
        widget=forms.Select(attrs={'id': 'id_tour'})
    )

    schedule = forms.ModelChoiceField(
        queryset=TourSchedule.objects.none(),
        label='Выберите дату тура',
        widget=forms.Select(attrs={'id': 'id_schedule'}),
        required=True
    )

    class Meta:
        model = Booking

        fields = [
            "tour",
            "schedule",
            "name",
            "email",
            "people"
        ]

        widgets = {
            "name": forms.TextInput(
                attrs={
                    'placeholder': 'Введите ваше имя'
                }
            ),

            "email": forms.EmailInput(
                attrs={
                    'placeholder': 'example@mail.com'
                }
            ),

            "people": forms.NumberInput(
                attrs={
                    'min': 1,
                    'placeholder': 'Количество человек'
                }
            )
        }

    def __init__(self, *args, **kwargs):
        """
        Инициализация формы

        QuerySet задаем динамически,
        чтобы данные всегда были актуальными
        """

        super().__init__(*args, **kwargs)

        # Только не удаленные туры
        self.fields['tour'].queryset = (
            Tour.objects.filter(
                removed=False
            )
        )

        # Только активные будущие расписания
        self.fields['schedule'].queryset = (
            TourSchedule.objects.filter(
                is_active=True,
                start_date__gte=date.today()
            ).select_related('tour')
        )

    def clean_people(self):
        """
        Проверка количества человек
        """

        people = self.cleaned_data.get('people')

        if people is None:
            raise forms.ValidationError(
                "Укажите количество человек"
            )

        if people <= 0:
            raise forms.ValidationError(
                "Количество человек должно быть больше нуля"
            )

        return people

    def clean(self):
        """
        Главная серверная проверка бронирования

        Проверяем:
        - принадлежность расписания туру
        - количество свободных мест
        - актуальное состояние БД
        """

        cleaned_data = super().clean()

        tour = cleaned_data.get("tour")
        schedule = cleaned_data.get("schedule")
        people = cleaned_data.get("people")

        # Если какие-то данные отсутствуют — прекращаем дальнейшую проверку
        if not tour or not schedule or not people:
            return cleaned_data

        # Проверяем, что расписание принадлежит выбранному туру
        if schedule.tour_id != tour.id:
            raise forms.ValidationError(
                "Выбранная дата не принадлежит выбранному туру"
            )

        # Проверяем активность расписания
        if not schedule.is_active:
            raise forms.ValidationError(
                "Выбранная дата недоступна для бронирования"
            )

        # Проверяем, что дата тура не прошла
        if schedule.start_date < date.today():
            raise forms.ValidationError(
                "Нельзя забронировать прошедший тур"
            )

        # Считаем актуальное количество занятых мест напрямую из БД
        booked = (
            Booking.objects.filter(
                schedule=schedule,
                status__in=['pending', 'confirmed']
            ).aggregate(
                total=Sum('people')
            )['total'] or 0
        )

        # Вычисляем количество свободных мест
        available = max(
            0,
            schedule.tour.max_people - booked
        )

        # Главная проверка доступности мест
        if people > available:
            raise forms.ValidationError(
                f"Недостаточно свободных мест. "
                f"Доступно мест: {available}"
            )

        return cleaned_data


class ConsentForm(forms.ModelForm):
    """Форма загрузки согласия"""

    class Meta:
        model = ConsentDocument

        fields = ["document"]


class TourForm(forms.ModelForm):
    """Форма создания и редактирования тура"""

    class Meta:
        model = Tour

        fields = [
            'title',
            'description',
            'duration',
            'price',
            'max_people',
            'image'
        ]

        widgets = {
            'description': forms.Textarea(
                attrs={
                    'rows': 5,
                    'cols': 40
                }
            ),

            'duration': forms.NumberInput(
                attrs={
                    'min': 1
                }
            ),

            'price': forms.NumberInput(
                attrs={
                    'step': 0.01,
                    'min': 0
                }
            ),

            'max_people': forms.NumberInput(
                attrs={
                    'min': 1
                }
            ),
        }
