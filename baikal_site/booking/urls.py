"""
URL Configuration для приложения
"""
from django.urls import path
from .views import booking_view

urlpatterns = [
    path('', booking_view, name='booking'),
]
