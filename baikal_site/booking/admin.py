"""
Регистрация форм
"""
from django.contrib import admin
from .models import Tour, Booking, ConsentDocument


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'duration', 'price', 'max_people']
    list_filter = ['duration']
    search_fields = ['title']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email', 'tour', 'tour_date', 'people']
    list_filter = ['tour', 'tour_date']
    search_fields = ['name', 'email']


@admin.register(ConsentDocument)
class ConsentDocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'document']