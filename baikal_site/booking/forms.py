"""
Формы для бронирования тура.
"""

from django import forms
from .models import Booking, ConsentDocument


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

    def clean(self):
        """Проверка на максимальное количество участников тура"""

        cleaned_data = super().clean()

        tour = cleaned_data.get("tour")
        people = cleaned_data.get("people")

        if tour and people:
            if people > tour.max_people:
                raise forms.ValidationError(
                    f"Максимум для этого тура: {tour.max_people}"
                )

        return cleaned_data


class ConsentForm(forms.ModelForm):
    """Форма для загрузки .pdf файла"""

    class Meta:
        """Класс для загрузки .pdf файла"""
        model = ConsentDocument
        fields = ["document"]
