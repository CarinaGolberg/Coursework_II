"""
Регистрация форм
"""
from django.contrib import admin
from .models import Tour, Booking, ConsentDocument

admin.site.register(Tour)
admin.site.register(Booking)
admin.site.register(ConsentDocument)
