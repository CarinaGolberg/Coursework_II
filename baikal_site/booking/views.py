"""
Представления (views) для приложения бронирования туров.
"""
from django.shortcuts import render
from .forms import TourBookingForm


def booking_view(request):
    """
    Функция обрабатывает отправку формы бронирования тура.
    
    При POST-запросе проверяет данные формы и сохраняет их.
    При GET-запросе просто отображает пустую форму.
    
    Args:
        request: HTTP объект запроса
        
    Returns:
        Отрисованный HTML ответ с формой и отправленными данными
    """

    data = None

    if request.method == "POST":
        form = TourBookingForm(request.POST)

        if form.is_valid():
            data = form.cleaned_data
    else:
        form = TourBookingForm()
    return render(request, "booking/form.html", {
        "form": form,
        "data": data
    })
