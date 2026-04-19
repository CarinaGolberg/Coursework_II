"""
Формы для бронирования тура.
"""

from django import forms
from .models import Booking, ConsentDocument, Tour


class BookingForm(forms.ModelForm):
    """Форма для бронирования тура"""

    class Meta:
        """Класс для бронирования тура"""
        model = Booking
        fields = [
            "tour",
            "name",
            "email",
            "tour_date",
            "people"
        ]

        widgets = {
            "tour_date": forms.DateInput(attrs={"type": "date"})
        }

    def __init__(self, *args, **kwargs):
        """Инициализация формы - показываем только не удаленные туры"""
        super().__init__(*args, **kwargs)
        # Показываем только туры, которые не удалены
        self.fields['tour'].queryset = Tour.objects.filter(removed=False)

    def clean_people(self):
        """Проверка количества человек"""
        people = self.cleaned_data.get('people')
        
        if people is not None:
            if people <= 0:
                raise forms.ValidationError("Количество человек должно быть больше нуля")
        
        return people

    def clean(self):
        """Проверка на максимальное количество участников тура"""
        cleaned_data = super().clean()

        tour = cleaned_data.get("tour")
        people = cleaned_data.get("people")

        if tour and people:
            if people > tour.max_people:
                raise forms.ValidationError(
                    f"Количество человек не может превышать {tour.max_people} для этого тура"
                )

        return cleaned_data


class ConsentForm(forms.ModelForm):
    """Форма для загрузки .pdf файла"""

    class Meta:
        """Класс для загрузки .pdf файла"""
        model = ConsentDocument
        fields = ["document"]


class TourForm(forms.ModelForm):
    """Форма для создания и редактирования тура"""
    
    class Meta:
        model = Tour
        fields = ['title', 'description', 'duration', 'price', 'max_people', 'image']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 5, 'cols': 40}),
            'duration': forms.NumberInput(attrs={'min': 1}),
            'price': forms.NumberInput(attrs={'step': 0.01, 'min': 0}),
            'max_people': forms.NumberInput(attrs={'min': 1}),
        }
        labels = {
            'title': 'Название тура',
            'description': 'Описание',
            'duration': 'Длительность (дней)',
            'price': 'Цена (руб.)',
            'max_people': 'Максимальное количество участников',
            'image': 'Изображение тура',
        }