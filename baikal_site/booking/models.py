"""
Модели БД для бронирования тура
"""

from django.db import models


class Tour(models.Model):
    """Модель, описывающая тур"""

    objects = models.Manager()

    title = models.CharField(max_length=200)
    description = models.TextField()
    duration = models.IntegerField()
    price = models.DecimalField(max_digits=10,decimal_places=2)
    max_people = models.IntegerField()

    image = models.ImageField(
        upload_to="tours/",
        default="tours/default.jpg")

    def __str__(self):
        return str(self.title)


class Booking(models.Model):
    """Модель для бронирования тура"""

    tour = models.ForeignKey(Tour, on_delete=models.CASCADE)

    name = models.CharField(max_length=200, null=False)
    email = models.EmailField(null=False)

    tour_date = models.DateField()

    people = models.IntegerField()

    def __str__(self):
        return str(self.name)


class ConsentDocument(models.Model):
    """Согласие на обработку персональных данных"""

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE)

    document = models.FileField(upload_to="consents/")
