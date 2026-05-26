"""
URL-patterns
"""
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from . import views

urlpatterns = [

    # Главная страница со списком туров
    path('', views.tour_list_view, name='home'),

    # Страница с формой бронирования
    path('booking/', views.booking_view, name='booking'),
    
    # Страница со списком всех туров
    path('tours/', views.tour_list_view, name='tour_list'),
    
    # Страница детализации тура
    path('tour/<int:pk>/', views.tour_detail_view, name='tour_detail'),
    
    # Страница редактирования тура
    path('tour/<int:pk>/edit/', views.tour_edit_view, name='tour_edit'),
    
    # Удаление тура 
    path('tour/<int:pk>/delete/', views.tour_delete_view, name='tour_delete'),
    
    # Восстановление тура
    path('tour/<int:pk>/restore/', views.tour_restore_view, name='tour_restore'),

    path('ajax/tour-details/', views.get_tour_details_ajax, name='ajax_tour_details'),
    path('ajax/schedule-availability/', views.get_schedule_availability_ajax, name='ajax_schedule_availability'),
    path('ajax/calculate-price/', views.calculate_price_ajax, name='ajax_calculate_price'),

    # Управление бронированиями (только для админов)
    path('manage/bookings/', views.manage_bookings_view, name='manage_bookings'),
]
