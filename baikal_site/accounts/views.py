from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .forms import CustomUserCreationForm, CustomAuthenticationForm, UserProfileForm, CustomPasswordChangeForm
from .models import User, UserActivityLog
from booking.models import Booking, Tour
import uuid


def register_view(request):
    """Регистрация пользователя"""
    if request.user.is_authenticated:
        return redirect('profile')
    
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            # Генерируем токен для подтверждения email
            user.email_verification_token = str(uuid.uuid4())
            user.save()
            
            # Отправляем письмо с подтверждением
            verification_url = request.build_absolute_uri(
                reverse('accounts:verify_email', args=[user.email_verification_token]) 
            )
            
            try:
                send_mail(
                    'Подтверждение регистрации',
                    f'Для подтверждения регистрации перейдите по ссылке: {verification_url}',
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
                messages.success(request, 'Регистрация успешна! На вашу почту отправлено письмо с подтверждением.')
            except Exception as e:
                messages.warning(request, 'Регистрация успешна, но не удалось отправить письмо. Обратитесь к администратору.')
            
            return redirect('accounts:login')
    else:
        form = CustomUserCreationForm()
    
    return render(request, 'accounts/register.html', {'form': form})


def verify_email_view(request, token):
    """Подтверждение email"""
    user = get_object_or_404(User, email_verification_token=token)
    user.is_email_verified = True
    user.email_verification_token = None
    user.save()
    messages.success(request, 'Email успешно подтвержден! Теперь вы можете войти.')
    return redirect('accounts:login')


def login_view(request):
    """Вход в систему"""
    if request.user.is_authenticated:
        return redirect('accounts:profile')  # Всех отправляем в профиль
    
    if request.method == 'POST':
        form = CustomAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                
                UserActivityLog.objects.create(
                    user=user,
                    action='login',
                    ip_address=get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                messages.success(request, f'Добро пожаловать, {user.username}!')
                return redirect('accounts:profile')
    else:
        form = CustomAuthenticationForm()
    
    return render(request, 'accounts/login.html', {'form': form})


def logout_view(request):
    """Выход из системы"""
    if request.user.is_authenticated:
        UserActivityLog.objects.create(
            user=request.user,
            action='logout',
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        logout(request)
        messages.info(request, 'Вы вышли из системы')
    return redirect('accounts:login')


@login_required
def profile_view(request):
    """Личный кабинет пользователя"""
    bookings = Booking.objects.filter(email=request.user.email).order_by('-created_at')
    favorites = request.user.favorite_tours.all()
    
    activities = request.user.activities.order_by('-created_at').all()[:20]
    
    
    context = {
        'user': request.user,
        'bookings': bookings,
        'favorites': favorites,
        'activities': activities,
        'total_bookings': bookings.count(),
        'total_favorites': favorites.count(),
    }
    return render(request, 'accounts/profile.html', context)


@login_required
def profile_edit_view(request):
    """Редактирование профиля"""
    if request.method == 'POST':
        form = UserProfileForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            
            UserActivityLog.objects.create(
                user=request.user,
                action='edit_profile',
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            messages.success(request, 'Профиль успешно обновлен!')
            return redirect('accounts:profile')
    else:
        form = UserProfileForm(instance=request.user)
    
    return render(request, 'accounts/profile_edit.html', {'form': form})


@login_required
def change_password_view(request):
    """Смена пароля"""
    if request.method == 'POST':
        form = CustomPasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
            messages.success(request, 'Пароль успешно изменен!')
            return redirect('accounts:profile')
    else:
        form = CustomPasswordChangeForm(request.user)
    
    return render(request, 'accounts/change_password.html', {'form': form})


@login_required
def add_favorite_view(request, tour_id):
    """Добавление / удаление тура из избранного"""

    tour = get_object_or_404(Tour, id=tour_id, removed=False)

    # Проверяем: уже в избранном?
    is_favorite = request.user.favorite_tours.filter(id=tour.id).exists()

    # Если уже есть → удаляем
    if is_favorite:

        request.user.favorite_tours.remove(tour)

        UserActivityLog.objects.create(
            user=request.user,
            action='remove_favorite',
            tour=tour,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        # AJAX
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'is_favorite': False
            })

    # Если нет → добавляем
    else:

        request.user.favorite_tours.add(tour)

        UserActivityLog.objects.create(
            user=request.user,
            action='add_favorite',
            tour=tour,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        # AJAX
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'is_favorite': True
            })

    # fallback без AJAX
    return redirect(request.META.get('HTTP_REFERER', 'booking:tour_list'))


@login_required
def remove_favorite_view(request, tour_id):
    """Удаление тура из избранного"""
    tour = get_object_or_404(Tour, id=tour_id)
    request.user.favorite_tours.remove(tour)
    
    UserActivityLog.objects.create(
        user=request.user,
        action='remove_favorite',
        tour=tour,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'message': 'Тур удален из избранного'})
    
    messages.success(request, f'Тур "{tour.title}" удален из избранного')
    return redirect(request.META.get('HTTP_REFERER', 'accounts:profile'))


def get_client_ip(request):
    """Получение IP адреса пользователя"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
