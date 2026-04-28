"""
URL-patterns
"""
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from . import views

urlpatterns = [
    # Главная страница с формой бронирования
    path('', views.booking_view, name='booking'),
    
    # Страница со списком всех туров
    path('tours/', views.tour_list_view, name='tour_list'),
    
    # Страница детализации тура
    path('tour/<int:pk>/', views.tour_detail_view, name='tour_detail'),
    
    # Страница редактирования тура
    path('tour/<int:pk>/edit/', views.tour_edit_view, name='tour_edit'),
    
    # Удаление тура (мягкое)
    path('tour/<int:pk>/delete/', views.tour_delete_view, name='tour_delete'),
    
    # Восстановление тура
    path('tour/<int:pk>/restore/', views.tour_restore_view, name='tour_restore'),

    path('ajax/tour-details/', views.get_tour_details_ajax, name='ajax_tour_details'),
    path('ajax/calculate-price/', views.calculate_price_ajax, name='ajax_calculate_price'),
]
