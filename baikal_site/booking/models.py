"""
Модели БД для бронирования тура
"""

from datetime import date, timedelta
import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum


class Tour(models.Model):
    """Модель, описывающая тур"""

    objects = models.Manager()

    title = models.CharField(max_length=200)
    description = models.TextField()
    duration = models.IntegerField(
        help_text="Длительность тура в днях"
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    max_people = models.IntegerField(
        help_text="Максимум участников на одну дату"
    )

    removed = models.BooleanField(default=False)

    image = models.ImageField(
        upload_to="tours/",
        default="tours/default.jpg"
    )

    def __str__(self):
        return str(self.title)

    def get_available_schedules(self):
        """Получить все активные расписания для этого тура"""

        return self.schedules.filter(
            is_active=True,
            start_date__gte=date.today()
        )

    def get_total_booked_for_schedule(self, schedule):
        """
        Получить общее количество забронированных мест
        для конкретного расписания
        """

        return (
            Booking.objects.filter(
                schedule=schedule,
                status__in=['pending', 'confirmed']
            ).aggregate(
                total=Sum('people')
            )['total'] or 0
        )

    def get_available_seats_for_schedule(self, schedule):
        """Получить количество свободных мест для расписания"""

        if not schedule.is_active:
            return 0

        booked = self.get_total_booked_for_schedule(schedule)

        return max(0, self.max_people - booked)


class TourSchedule(models.Model):
    """Расписание туров - конкретные даты проведения"""

    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name='schedules'
    )

    start_date = models.DateField(
        help_text="Дата начала тура"
    )

    end_date = models.DateField(
        blank=True,
        null=True,
        help_text="Дата окончания тура (рассчитывается автоматически)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Активно ли это расписание"
    )

    class Meta:
        ordering = ['start_date']

        constraints = [
            models.UniqueConstraint(
                fields=['tour', 'start_date'],
                name='unique_tour_start_date'
            )
        ]

    def save(self, *args, **kwargs):
        """
        Автоматически рассчитываем дату окончания тура
        """

        if not self.end_date:
            self.end_date = (
                self.start_date +
                timedelta(days=self.tour.duration - 1)
            )

        super().save(*args, **kwargs)

    def __str__(self):
        end_str = (
            f" - {self.end_date}"
            if self.end_date else ""
        )

        return f"{self.tour.title}: {self.start_date}{end_str}"

    @property
    def total_booked(self):
        """
        Общее количество забронированных мест

        Учитываются только:
        - pending
        - confirmed

        cancelled не учитываются
        """

        return (
            self.bookings.filter(
                status__in=['pending', 'confirmed']
            ).aggregate(
                total=Sum('people')
            )['total'] or 0
        )

    @property
    def available_seats(self):
        """
        Количество свободных мест
        """

        return max(
            0,
            self.tour.max_people - self.total_booked
        )

    @property
    def is_available(self):
        """
        Доступно ли расписание для бронирования
        """

        return (
            self.is_active and
            self.available_seats > 0
        )


class Booking(models.Model):
    """Модель для бронирования тура"""

    STATUS_CHOICES = [
        ('pending', 'Ожидает подтверждения'),
        ('confirmed', 'Подтверждено'),
        ('cancelled', 'Отменено'),
    ]

    schedule = models.ForeignKey(
        TourSchedule,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE
    )

    name = models.CharField(
        max_length=200,
        null=False
    )

    email = models.EmailField(
        null=False
    )

    people = models.IntegerField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    booking_reference = models.CharField(
        max_length=10,
        unique=False,
        blank=True
    )

    def clean(self):
        """
        Серверная проверка доступности мест
        """

        if not self.schedule:
            raise ValidationError(
                "Необходимо выбрать расписание"
            )

        # Проверка соответствия тура и расписания
        if self.schedule.tour_id != self.tour_id:
            raise ValidationError(
                "Расписание не принадлежит выбранному туру"
            )

        if self.people <= 0:
            raise ValidationError(
                "Количество человек должно быть больше нуля"
            )

        # Считаем уже занятые места
        booked = (
            Booking.objects.filter(
                schedule=self.schedule,
                status__in=['pending', 'confirmed']
            ).exclude(
                pk=self.pk
            ).aggregate(
                total=Sum('people')
            )['total'] or 0
        )

        available = max(
            0,
            self.schedule.tour.max_people - booked
        )

        # ГЛАВНАЯ ПРОВЕРКА
        if self.people > available:
            raise ValidationError(
                f"Недостаточно мест. "
                f"Доступно: {available}"
            )

    def save(self, *args, **kwargs):
        """
        Сохранение бронирования
        """

        # Полная серверная валидация
        self.full_clean()

        # Генерация номера бронирования
        if not self.booking_reference:
            self.booking_reference = (
                str(uuid.uuid4())
                .replace('-', '')[:8]
                .upper()
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.name} - "
            f"{self.schedule.start_date}"
        )


class ConsentDocument(models.Model):
    """Согласие на обработку персональных данных"""

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='consent_documents'
    )

    document = models.FileField(
        upload_to="consents/"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"Согласие для {self.booking.name}"
