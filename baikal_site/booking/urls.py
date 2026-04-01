"""
URL-patterns
"""
from django.urls import path
from .views import booking_view, tour_info

urlpatterns = [
    path('', booking_view, name='booking'),
    path('tour/<int:tour_id>/', tour_info, name='tour_info'),
]
