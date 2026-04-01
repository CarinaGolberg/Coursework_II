"""
Отображение форм
"""
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .forms import BookingForm, ConsentForm
from .models import Tour


def booking_view(request):
    """Метод для отображения форм"""

    if request.method == "POST":

        booking_form = BookingForm(request.POST)
        consent_form = ConsentForm(request.POST, request.FILES)

        if booking_form.is_valid() and consent_form.is_valid():

            booking = booking_form.save()

            consent = consent_form.save(commit=False)
            consent.booking = booking
            consent.save()

            return redirect("booking")

    else:

        booking_form = BookingForm()
        consent_form = ConsentForm()

    return render(
        request,
        "booking/booking_form.html",
        {
            "booking_form": booking_form,
            "consent_form": consent_form
        }
    )

def tour_info(_request, tour_id):
    """Возвращает информацию о туре"""

    tour = Tour.objects.get(id=tour_id)

    data = {
        "title": tour.title,
        "description": tour.description,
        "duration": tour.duration,
        "price": tour.price,
        "max_people": tour.max_people,
        "image": tour.image.url
    }

    return JsonResponse(data)
