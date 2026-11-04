from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name: str = models.CharField(max_length=100, unique=True)
    slug: str = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name_plural = "Categories"

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Component(models.Model):
    class RamType(models.TextChoices):
        DDR4 = 'DDR4', 'DDR4'
        DDR5 = 'DDR5', 'DDR5'

    class FormFactor(models.TextChoices):
        ATX = 'ATX', 'ATX'
        MICRO_ATX = 'Micro-ATX', 'Micro-ATX'
        MINI_ITX = 'Mini-ITX', 'Mini-ITX'

    name: str = models.CharField(max_length=200)
    brand: str = models.CharField(max_length=100)
    category: Category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='components'
    )
    socket: str = models.CharField(max_length=50, null=True, blank=True)
    ram_type: str = models.CharField(
        max_length=10,
        choices=RamType.choices,
        null=True,
        blank=True
    )
    tdp: int = models.IntegerField(default=0, help_text="Power consumption in Watts")
    power_supply: int = models.IntegerField(
        default=0,
        help_text="Required PSU power in Watts"
    )
    form_factor: str = models.CharField(
        max_length=20,
        choices=FormFactor.choices,
        null=True,
        blank=True
    )
    length_mm = models.PositiveIntegerField(null=True, blank=True, help_text='Component length in millimeters, such as GPU length')
    height_mm = models.PositiveIntegerField(null=True, blank=True, help_text='Component height in millimeters, such as cooler height')
    max_gpu_length_mm = models.PositiveIntegerField(null=True, blank=True, help_text='Maximum GPU length supported by this case')
    max_cooler_height_mm = models.PositiveIntegerField(null=True, blank=True, help_text='Maximum CPU cooler height supported by this case')
    price_avg = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='components/', null=True, blank=True)
    description: str = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.brand} {self.name}"

