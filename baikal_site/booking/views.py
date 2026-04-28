"""
Отображение форм
"""
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from datetime import datetime

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

    # Передаем все туры для AJAX запросов
    tours = Tour.objects.filter(removed=False)
    
    return render(
        request,
        "booking/booking_form.html",
        {
            "booking_form": booking_form,
            "consent_form": consent_form,
            "tours": tours
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


# ============= AJAX VIEWS =============

@require_http_methods(["GET"])
def get_tour_details_ajax(request):
    """
    AJAX-запрос 1: Получение детальной информации о туре
    """
    tour_id = request.GET.get('tour_id')
    
    if not tour_id:
        return JsonResponse({
            'error': 'Не указан ID тура'
        }, status=400)
    
    try:
        tour = Tour.objects.get(id=tour_id, removed=False)
        
        # Получаем общее количество забронированных мест
        bookings = Booking.objects.filter(tour=tour)
        total_booked = sum(booking.people for booking in bookings)
        
        return JsonResponse({
            'success': True,
            'tour': {
                'id': tour.id,
                'title': tour.title,
                'description': tour.description,
                'duration': tour.duration,
                'price': str(tour.price),
                'max_people': tour.max_people,
                'total_booked': total_booked,
                'available_seats': tour.max_people - total_booked,
                'image_url': tour.image.url if tour.image else None,
            }
        })
        
    except Tour.DoesNotExist:
        return JsonResponse({
            'error': 'Тур не найден'
        }, status=404)


@require_http_methods(["GET"])
def calculate_price_ajax(request):
    """
    AJAX-запрос 2: Расчет общей стоимости тура (без скидки)
    """
    tour_id = request.GET.get('tour_id')
    people_count = request.GET.get('people_count')
    
    if not tour_id:
        return JsonResponse({
            'error': 'Не указан ID тура'
        }, status=400)
    
    if not people_count:
        return JsonResponse({
            'error': 'Не указано количество человек'
        }, status=400)
    
    try:
        tour = Tour.objects.get(id=tour_id, removed=False)
        people = int(people_count)
        
        if people <= 0:
            return JsonResponse({
                'error': 'Количество человек должно быть больше 0'
            }, status=400)
        
        # Простой расчет без скидки
        total_price = tour.price * people
        
        return JsonResponse({
            'success': True,
            'calculation': {
                'tour_id': tour.id,
                'tour_title': tour.title,
                'price_per_person': str(tour.price),
                'people_count': people,
                'currency': 'руб.'
            }
        })
        
    except Tour.DoesNotExist:
        return JsonResponse({
            'error': 'Тур не найден'
        }, status=404)
    except ValueError:
        return JsonResponse({
            'error': 'Неверное количество человек'
        }, status=400)
