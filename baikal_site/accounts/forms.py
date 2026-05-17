"""
Форма для личного кабинета пользователя
"""
from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm, PasswordChangeForm
from .models import User


class CustomUserCreationForm(UserCreationForm):
    """Форма регистрации"""
    
    email = forms.EmailField(required=True, widget=forms.EmailInput(attrs={'placeholder': 'example@mail.com'}))
    phone = forms.CharField(max_length=20, required=False, widget=forms.TextInput(attrs={'placeholder': '+7 (999) 123-45-67'}))
    
    class Meta:
        model = User
        fields = ('username', 'email', 'phone', 'password1', 'password2')
        widgets = {
            'username': forms.TextInput(attrs={'placeholder': 'Введите имя пользователя'}),
        }
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('Пользователь с таким email уже существует')
        return email
    
    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone and User.objects.filter(phone=phone).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('Пользователь с таким телефоном уже существует')
        return phone


class CustomAuthenticationForm(AuthenticationForm):
    """Форма входа"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'placeholder': 'Имя пользователя'})
        self.fields['password'].widget.attrs.update({'placeholder': 'Пароль'})


class UserProfileForm(forms.ModelForm):
    """Форма редактирования профиля"""
    
    class Meta:
        model = User
        fields = ('username', 'email', 'phone', 'bio', 'birth_date', 'avatar')
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '+7 (999) 123-45-67'}),
            'bio': forms.Textarea(attrs={'rows': 4, 'class': 'form-control', 'placeholder': 'Расскажите о себе...'}),
            'birth_date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'avatar': forms.FileInput(attrs={'class': 'form-control'}),
        }
    
    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.exclude(pk=self.instance.pk).filter(username=username).exists():
            raise forms.ValidationError('Это имя пользователя уже занято')
        return username
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.exclude(pk=self.instance.pk).filter(email=email).exists():
            raise forms.ValidationError('Этот email уже используется')
        return email


class CustomPasswordChangeForm(PasswordChangeForm):
    """Форма смены пароля"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['old_password'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Текущий пароль'})
        self.fields['new_password1'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Новый пароль'})
        self.fields['new_password2'].widget.attrs.update({'class': 'form-control', 'placeholder': 'Подтверждение пароля'})
