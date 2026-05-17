"""
Регистрация форм в административной панели
"""
from django.contrib import admin
from .models import Tour, TourSchedule, Booking, ConsentDocument


class TourScheduleInline(admin.TabularInline):
    """Встроенная форма для расписания тура"""
    model = TourSchedule
    extra = 3
    fields = ['start_date', 'end_date', 'is_active']
    readonly_fields = ['end_date']
    
    def get_extra(self, request, obj=None, **kwargs):
        return 3 if obj else 0


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'duration', 'price', 'max_people', 'removed']
    list_filter = ['duration', 'removed']
    search_fields = ['title', 'description']
    list_editable = ['price', 'max_people']
    list_per_page = 20
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('title', 'description')
        }),
        ('Параметры тура', {
            'fields': ('duration', 'price', 'max_people')
        }),
        ('Изображение', {
            'fields': ('image',),
            'classes': ('collapse',)
        }),
        ('Статус', {
            'fields': ('removed',),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [TourScheduleInline]


@admin.register(TourSchedule)
class TourScheduleAdmin(admin.ModelAdmin):
    list_display = ['id', 'tour', 'start_date', 'end_date', 'is_active', 'available_seats']
    list_filter = ['tour', 'is_active', 'start_date']
    search_fields = ['tour__title']
    list_editable = ['is_active']
    date_hierarchy = 'start_date'
    
    def available_seats(self, obj):
        """Отображение свободных мест в админке"""
        booked = sum(booking.people for booking in obj.bookings.all())
        available = obj.tour.max_people - booked
        if available <= 0:
            return f'❌ {available} (нет мест)'
        elif available <= 3:
            return f'⚠️ {available} (осталось мало)'
        else:
            return f'✅ {available}'
    available_seats.short_description = 'Свободных мест'


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'booking_reference', 'name', 'email', 
        'get_tour_title', 'get_schedule_date', 'people', 'status', 'created_at'
    ]
    list_filter = ['status', 'tour', 'schedule__start_date']
    search_fields = ['name', 'email', 'booking_reference']
    list_editable = ['status']
    readonly_fields = ['booking_reference', 'created_at']
    list_per_page = 20
    date_hierarchy = 'created_at'
    
    def get_tour_title(self, obj):
        """Получить название тура"""
        return obj.tour.title
    get_tour_title.short_description = 'Тур'
    get_tour_title.admin_order_field = 'tour__title'
    
    def get_schedule_date(self, obj):
        """Получить дату тура из расписания"""
        if obj.schedule:
            return f"{obj.schedule.start_date} - {obj.schedule.end_date}"
        return 'Дата не указана'
    get_schedule_date.short_description = 'Дата тура'
    get_schedule_date.admin_order_field = 'schedule__start_date'
    
    fieldsets = (
        ('Информация о бронировании', {
            'fields': ('booking_reference', 'tour', 'schedule', 'people', 'status')
        }),
        ('Контактные данные', {
            'fields': ('name', 'email')
        }),
        ('Системная информация', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ConsentDocument)
class ConsentDocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_booking_name', 'get_booking_reference', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['booking__name', 'booking__email', 'booking__booking_reference']
    readonly_fields = ['uploaded_at']
    
    def get_booking_name(self, obj):
        """Имя пользователя из связанного бронирования"""
        return obj.booking.name
    get_booking_name.short_description = 'Имя клиента'
    
    def get_booking_reference(self, obj):
        """Код бронирования"""
        return obj.booking.booking_reference
    get_booking_reference.short_description = 'Код бронирования'


# Настройка заголовков админки
admin.site.site_header = 'Панель управления бронированием туров'
admin.site.site_title = 'Бронирование туров'
admin.site.index_title = 'Добро пожаловать в систему управления турами'
