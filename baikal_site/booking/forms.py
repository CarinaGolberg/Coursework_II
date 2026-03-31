"""
Форма для бронирования тура на озере Байкал.
"""
from django import forms

class TourBookingForm(forms.Form):
    """
    Класс для бронирования тура на озеро Байкал.
    
    Содержит поля:
    - name: имя клиента (обязательное)
    - email: email (обязательное)
    - tour: выбор тура
    - people: количество человек
    - tour_date: дата тура
    """

    name = forms.CharField(
        label="Ваше имя",
        max_length=100,
        required=True
    )

    email = forms.EmailField(
        label="Email",
        required=True
    )

    tour = forms.ChoiceField(
        label="Выберите тур",
        choices = [
            ('north', 'Север Байкала'),
            ('olkhon', 'Остров Ольхон'),
            ('winter', 'Зимний тур'),
            ('summer', 'Летний тур')
        ]
    )

    people = forms.IntegerField(
        label="Количество человек",
        min_value=1,
        max_value=20
    )

    tour_date = forms.DateField(
        label="Дата тура",
        widget=forms.DateInput(attrs={'type': 'date'})
    )
