"""
Регистрация форм
"""
from django.contrib import admin
from .models import Tour, Booking

admin.site.register(Tour)
admin.site.register(Booking)
