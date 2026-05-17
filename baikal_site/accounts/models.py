"""
Модель для личного кабинета пользователя
"""
from django.contrib.auth.models import AbstractUser
import uuid
from django.db import models


class User(AbstractUser):
    """Расширенная модель пользователя"""
    
    # Дополнительные поля
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Телефон')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name='Аватар')
    bio = models.TextField(max_length=500, blank=True, verbose_name='О себе')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    
    # Статус верификации
    is_email_verified = models.BooleanField(default=False, verbose_name='Email подтвержден')
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    
    # Избранные туры
    favorite_tours = models.ManyToManyField('booking.Tour', blank=True, related_name='favorited_by', verbose_name='Избранные туры')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата регистрации')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        return str(self.username)
    
    @property
    def is_tour_manager(self):
        return self.groups.filter(name='Tour Managers').exists()
    
    @property
    def total_bookings(self):
        return self.booking_set.count()
    
    @property
    def get_full_name_or_username(self):
        if self.get_full_name():
            return self.get_full_name()
        return self.username


class UserActivityLog(models.Model):
    """Лог активности пользователя"""
    
    ACTION_CHOICES = [
        ('login', 'Вход в систему'),
        ('logout', 'Выход из системы'),
        ('booking', 'Бронирование тура'),
        ('view_tour', 'Просмотр тура'),
        ('edit_profile', 'Редактирование профиля'),
        ('add_favorite', 'Добавление в избранное'),
        ('remove_favorite', 'Удаление из избранного'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities', verbose_name='Пользователь')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name='Действие')
    tour = models.ForeignKey('booking.Tour', on_delete=models.SET_NULL, null=True, blank=True, verbose_name='Тур')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP адрес')
    user_agent = models.TextField(blank=True, verbose_name='User Agent')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Время')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Лог активности'
        verbose_name_plural = 'Логи активности'
    
    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.created_at.strftime('%d.%m.%Y %H:%M')}"
