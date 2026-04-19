"""
Отображение форм
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.http import HttpResponseRedirect
from .forms import BookingForm, ConsentForm, TourForm
from .models import Tour, Booking, ConsentDocument


def booking_view(request):
    """Метод для отображения форм бронирования"""

    if request.method == "POST":

        booking_form = BookingForm(request.POST)
        consent_form = ConsentForm(request.POST, request.FILES)

        if booking_form.is_valid() and consent_form.is_valid():

            booking = booking_form.save()

            consent = consent_form.save(commit=False)
            consent.booking = booking
            consent.save()

            # Перенаправляем с параметром success
            return HttpResponseRedirect(reverse('booking') + '?success=1')

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


def tour_list_view(request):
    """Страница со списком всех не удаленных туров"""
    tours = Tour.objects.filter(removed=False)
    
    return render(
        request,
        "booking/tour_list.html",
        {
            "tours": tours
        }
    )


def tour_detail_view(request, pk):
    """Страница детализации тура с подробной информацией"""
    tour = get_object_or_404(Tour, pk=pk, removed=False)
    
    bookings = Booking.objects.filter(tour=tour)
    consent_docs = ConsentDocument.objects.filter(booking__tour=tour)
    total_booked = sum(booking.people for booking in bookings)
    
    return render(
        request,
        "booking/tour_detail.html",
        {
            "tour": tour,
            "bookings": bookings,
            "consent_docs": consent_docs,
            "total_booked": total_booked
        }
    )


def tour_edit_view(request, pk):
    """Страница редактирования тура"""
    tour = get_object_or_404(Tour, pk=pk)
    
    if request.method == "POST":
        form = TourForm(request.POST, request.FILES, instance=tour)
        if form.is_valid():
            form.save()
            return redirect('tour_detail', pk=tour.pk)
    else:
        form = TourForm(instance=tour)
    
    return render(
        request,
        "booking/tour_edit.html",
        {
            "form": form,
            "tour": tour
        }
    )


def tour_delete_view(request, pk):
    """Мягкое удаление тура (устанавливаем removed=True)"""
    tour = get_object_or_404(Tour, pk=pk)
    
    tour.removed = True
    tour.save()
    
    return redirect('tour_list')


def tour_restore_view(request, pk):
    """Восстановление удаленного тура (устанавливаем removed=False)"""
    tour = get_object_or_404(Tour, pk=pk, removed=True)
    
    tour.removed = False
    tour.save()
    
    return redirect('tour_list')