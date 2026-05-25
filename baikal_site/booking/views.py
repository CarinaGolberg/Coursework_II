"""
Отображение форм
"""
from datetime import date
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.core.paginator import Paginator
from django.db.models import Q
from django.db import models
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.admin.views.decorators import staff_member_required
from .models import Tour, Booking, ConsentDocument, TourSchedule
from .forms import BookingForm, ConsentForm, TourForm
from accounts.models import User
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings


def booking_view(request):
    """Метод для отображения форм бронирования"""

    if request.method == "POST":

        booking_form = BookingForm(request.POST)

        # Проверяем, есть ли файл в запросе
        if request.FILES.get('document'):
            consent_form = ConsentForm(request.POST, request.FILES)
            if consent_form.is_valid():
                consent = consent_form.save(commit=False)
        else:
            # Если файла нет, создаём пустую форму
            consent_form = ConsentForm()
            consent = None

        if booking_form.is_valid():
            booking = booking_form.save()

            booking.status = 'confirmed'
            booking.save()

            # Сохраняем документ согласия
            if consent:
                consent.booking = booking
                consent.save()

            # =========================
            # ОТПРАВКА EMAIL
            # =========================
            try:
                total_price = booking.tour.price * booking.people
                subject = f'Подтверждение бронирования тура #{booking.booking_reference}'

                message = f"""
Здравствуйте, {booking.name}!

Ваше бронирование подтверждено.

Тур: {booking.tour.title}
Дата: {booking.schedule.start_date.strftime('%d.%m.%Y')}
Человек: {booking.people}
Сумма: {total_price:,.0f} руб.
Код: {booking.booking_reference}

С уважением, BAIKALLUX
"""

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[booking.email],
                    fail_silently=False,
                )

            except Exception as e:
                print(f"Ошибка отправки email: {e}")

            messages.success(
                request,
                f'Бронирование успешно создано! Номер вашей брони: {booking.booking_reference}'
            )

            return HttpResponseRedirect(reverse('booking') + '?success=1')

        else:
            for field, errors in booking_form.errors.items():
                for error in errors:
                    messages.error(request, f"{field}: {error}")

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
    paginator = Paginator(tours, 6)
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
    
    # Получаем все расписания для этого тура
    schedules = TourSchedule.objects.filter(tour=tour).order_by('start_date')
    
    bookings = Booking.objects.filter(tour=tour).select_related('schedule')
    
    # Получаем всех пользователей для подтягивания телефонов
    user_emails = [booking.email for booking in bookings]
    users = User.objects.filter(email__in=user_emails)
    user_phone_map = {user.email: user.phone for user in users}
    
    consent_docs = ConsentDocument.objects.filter(booking__tour=tour)
    total_booked = sum(booking.people for booking in bookings)
    
    return render(
        request,
        "booking/tour_detail.html",
        {
            "tour": tour,
            "schedules": schedules,
            "bookings": bookings,
            "user_phone_map": user_phone_map,
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
            # Получаем актуальное количество забронированных мест
            booked = Booking.objects.filter(
                schedule=schedule,
                status__in=['pending', 'confirmed']
            ).aggregate(total=models.Sum('people'))['total'] or 0
            
            available_seats = tour.max_people - booked
            
            schedules_data.append({
                'id': schedule.id,
                'start_date': schedule.start_date.strftime('%d.%m.%Y'),
                'end_date': schedule.end_date.strftime('%d.%m.%Y'),
                'available_seats': available_seats,
                'total_booked': booked,
                'is_available': available_seats > 0,
                'max_people': tour.max_people
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
        
        try:
            requested_people = int(people_count)
        except ValueError:
            requested_people = 1
        
        # Получаем актуальное количество забронированных мест
        booked = Booking.objects.filter(
            schedule=schedule,
            status__in=['pending', 'confirmed']
        ).aggregate(total=models.Sum('people'))['total'] or 0
        
        available_seats = schedule.tour.max_people - booked
        is_available = available_seats >= requested_people
        
        return JsonResponse({
            'success': True,
            'schedule': {
                'id': schedule.id,
                'start_date': schedule.start_date.strftime('%d.%m.%Y'),
                'end_date': schedule.end_date.strftime('%d.%m.%Y'),
                'available_seats': available_seats,
                'total_booked': booked,
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
