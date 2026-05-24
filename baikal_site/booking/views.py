"""
Отображение форм
"""
from datetime import date
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.admin.views.decorators import staff_member_required
from django.core.mail import send_mail 
from django.conf import settings 
from .models import Tour, Booking, ConsentDocument, TourSchedule
from .forms import BookingForm, ConsentForm, TourForm


def booking_view(request):
    """Метод для отображения форм бронирования"""

    if request.method == "POST":

        booking_form = BookingForm(request.POST)
        consent_form = ConsentForm(request.POST, request.FILES)

        if booking_form.is_valid() and consent_form.is_valid():

            booking = booking_form.save()
            
            # Автоматическое подтверждение бронирования
            booking.status = 'confirmed'
            booking.save()

            consent = consent_form.save(commit=False)
            consent.booking = booking
            consent.save()

            # Отправка письма-подтверждения
            try:
                total_price = booking.tour.price * booking.people
                
                email_body = f"""
Здравствуйте, {booking.name}!

Ваше бронирование подтверждено.

Тур: {booking.tour.title}
Дата: {booking.schedule.start_date.strftime('%d.%m.%Y')}
Человек: {booking.people}
Сумма: {total_price:,.0f} руб.
Код: {booking.booking_reference}

С уважением, Baikal Tour
"""
                
                send_mail(
                    subject=f'Бронирование тура "{booking.tour.title}"',
                    message=email_body.strip(),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[booking.email],
                    fail_silently=False,
                )
                print(f"Письмо отправлено на {booking.email}")
            except Exception as e:
                print(f"Ошибка отправки письма: {e}")

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
    
    # Поиск
    search_query = request.GET.get('search', '')
    if search_query:
        tours = tours.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query)
        )
    
    # Фильтр по цене
    min_price = request.GET.get('min_price', '')
    max_price = request.GET.get('max_price', '')
    if min_price:
        tours = tours.filter(price__gte=min_price)
    if max_price:
        tours = tours.filter(price__lte=max_price)
    
    # Фильтр по длительности
    duration = request.GET.get('duration', '')
    if duration:
        tours = tours.filter(duration=duration)
    
    # Пагинация
    paginator = Paginator(tours, 6)  # 6 туров на страницу
    page_number = request.GET.get('page')
    tours_page = paginator.get_page(page_number)
    
    # Получаем все возможные значения длительности для фильтра
    durations = Tour.objects.filter(removed=False).values_list('duration', flat=True).distinct()
    
    context = {
        'tours': tours_page,
        'search_query': search_query,
        'min_price': min_price,
        'max_price': max_price,
        'selected_duration': duration,
        'durations': durations,
        'is_paginated': tours_page.has_other_pages(),
    }
    
    return render(request, "booking/tour_list.html", context)


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


@staff_member_required
def manage_bookings_view(request):
    """Страница управления бронированиями (только для администраторов)"""
    bookings = Booking.objects.select_related('tour', 'schedule').all().order_by('-created_at')
    
    # Пагинация
    paginator = Paginator(bookings, 20)
    page_number = request.GET.get('page')
    bookings_page = paginator.get_page(page_number)
    
    return render(request, 'booking/manage_bookings.html', {
        'bookings': bookings_page,
    })


# AJAX VIEWS

@require_http_methods(["GET"])
def get_tour_details_ajax(request):
    """AJAX-запрос: Получение детальной информации о туре и его расписании"""
    tour_id = request.GET.get('tour_id')
    
    if not tour_id:
        return JsonResponse({'error': 'Не указан ID тура'}, status=400)
    
    try:
        tour = Tour.objects.get(id=tour_id, removed=False)
        
        schedules = TourSchedule.objects.filter(
            tour=tour, 
            is_active=True,
            start_date__gte=date.today()
        ).order_by('start_date')
        
        schedules_data = []
        for schedule in schedules:
            schedules_data.append({
                'id': schedule.id,
                'start_date': schedule.start_date.strftime('%d.%m.%Y'),
                'end_date': schedule.end_date.strftime('%d.%m.%Y'),
                'available_seats': schedule.available_seats,
                'total_booked': schedule.total_booked,
                'is_available': schedule.available_seats > 0
            })
      
        all_bookings = Booking.objects.filter(tour=tour)
        total_booked_all = sum(booking.people for booking in all_bookings)
       
        return JsonResponse({
            'success': True,
            'tour': {
                'id': tour.id,
                'title': tour.title,
                'description': tour.description,
                'duration': tour.duration,
                'price': str(tour.price),
                'max_people': tour.max_people,
                'total_booked_all': total_booked_all,
                'image_url': tour.image.url if tour.image else None,
            },
            'schedules': schedules_data
        })

    except Tour.DoesNotExist:
        return JsonResponse({'error': 'Тур не найден'}, status=404)


@require_http_methods(["GET"])
def get_schedule_availability_ajax(request):
    """AJAX-запрос: Получение доступности конкретного расписания с учетом количества человек"""
    schedule_id = request.GET.get('schedule_id')
    people_count = request.GET.get('people_count', 1)
    
    if not schedule_id:
        return JsonResponse({'error': 'Не указан ID расписания'}, status=400)
    
    try:
        schedule = TourSchedule.objects.get(id=schedule_id, is_active=True)
        
        # Получаем количество человек из запроса
        try:
            requested_people = int(people_count)
        except ValueError:
            requested_people = 1
        
        # Проверяем доступность
        available_seats = schedule.available_seats
        is_available = available_seats >= requested_people
        
        return JsonResponse({
            'success': True,
            'schedule': {
                'id': schedule.id,
                'start_date': schedule.start_date.strftime('%d.%m.%Y'),
                'end_date': schedule.end_date.strftime('%d.%m.%Y'),
                'available_seats': available_seats,
                'total_booked': schedule.total_booked,
                'max_people': schedule.tour.max_people,
                'is_available': is_available,
                'requested_people': requested_people
            }
        })
        
    except TourSchedule.DoesNotExist:
        return JsonResponse({'error': 'Расписание не найдено'}, status=404)
    

@require_http_methods(["GET"])
def calculate_price_ajax(request):
    """AJAX-запрос: Расчет стоимости тура"""
    tour_id = request.GET.get('tour_id')
    people_count = request.GET.get('people_count')
    
    if not tour_id or not people_count:
        return JsonResponse({'error': 'Не указаны параметры'}, status=400)
    
    try:
        tour = Tour.objects.get(id=tour_id, removed=False)
        people = int(people_count)
        
        if people <= 0:
            return JsonResponse({'error': 'Количество человек должно быть больше 0'}, status=400)
        
        total_price = tour.price * people
        
        return JsonResponse({
            'success': True,
            'calculation': {
                'tour_id': tour.id,
                'price_per_person': str(tour.price),
                'people_count': people,
                'total_price': str(total_price),
                'currency': 'руб.'
            }
        })
        
    except Tour.DoesNotExist:
        return JsonResponse({'error': 'Тур не найден'}, status=404)
