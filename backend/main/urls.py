from django.urls import path
from . import views

# URLConf
urlpatterns = [
    path("fp/", views.fp),
    path("connectivity/", views.connectivity),
    path("analysis/", views.analysis),
    path("backboneFromGr/", views.backboneFromGr),
]
