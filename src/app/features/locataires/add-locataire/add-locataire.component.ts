import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LocataireService } from '../../../core/services/locataire.service';
import { ProprietaireService } from '../../../core/services/proprietaire.service';
import { Proprietaire } from '../../../core/models/proprietaire.model';
import { Residence } from '../../../core/models/residence.model';

@Component({
  selector: 'app-add-locataire',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './add-locataire.component.html',
  styleUrl: './add-locataire.component.css'
})
export class AddLocataireComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly locataireService = inject(LocataireService);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly profile = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.proprietaireService.getByOwnerId(ownerId) : of(undefined as Proprietaire | undefined)))),
    { initialValue: undefined as Proprietaire | undefined }
  );
  readonly residences = computed(() => (this.profile()?.residences ?? []).map((residence) => this.normalizeResidence(residence)));

  readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(3)]],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
    residenceId: ['', [Validators.required]],
    montantLoyer: [0, [Validators.required, Validators.min(0)]],
    dateEcheance: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
    dateEntree: ['', [Validators.required]],
  });

  etatDesLieuxImages: string[] = [];
  openedImage: string | null = null;
  errorMessage = '';
  editingId: string | null = null;
  loading = false;

  async ngOnInit(): Promise<void> {
    if (!this.authService.isLoggedIn()) {
      await this.router.navigate(['/login']);
      return;
    }

    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) {
      return;
    }

    this.editingId = id;
    const locataire = await firstValueFrom(this.locataireService.getById(id));

    if (locataire) {
      this.etatDesLieuxImages = [...(locataire.etatDesLieuxImages ?? [])];
      this.form.patchValue({
        nom: locataire.nom,
        telephone: locataire.telephone,
        residenceId: locataire.residenceId ?? this.findResidenceIdByAddress(locataire.adresse),
        montantLoyer: locataire.montantLoyer,
        dateEcheance: locataire.dateEcheance,
        dateEntree: locataire.dateEntree ? this.formatDateInput(locataire.dateEntree) : '',
      });
    }
  }

  selectedResidence(): Residence | undefined {
    return this.residences().find((residence) => residence.id === this.form.controls.residenceId.value);
  }

  async onEtatDesLieuxSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) {
      return;
    }

    const images = await Promise.all(files.map((file) => this.fileToBase64(file)));
    this.etatDesLieuxImages = [...this.etatDesLieuxImages, ...images];
  }

  removeEtatDesLieuxImage(index: number): void {
    this.etatDesLieuxImages = this.etatDesLieuxImages.filter((_, currentIndex) => currentIndex !== index);
  }

  openImage(image: string): void {
    this.openedImage = image;
  }

  closeOpenedImage(): void {
    this.openedImage = null;
  }

  residenceSummary(residence: Residence): string {
    const properties = residence.properties.length ? ` · ${residence.properties.join(', ')}` : '';
    return `${residence.capacity || 'Logement'} · ${residence.address}${properties}`;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

      const ownerId = this.authService.userId();
    if (!ownerId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const value = this.form.getRawValue();
      const selectedResidence = this.selectedResidence();

      if (!selectedResidence) {
        this.errorMessage = 'Sélectionnez un logement valide.';
        return;
      }

      const payload = {
        ownerId,
        nom: value.nom,
        telephone: value.telephone,
        residenceId: selectedResidence.id,
        residenceAddress: selectedResidence.address,
        residenceCapacity: selectedResidence.capacity,
        residenceProperties: [...selectedResidence.properties],
        residenceImages: [...selectedResidence.images],
        adresse: selectedResidence.address,
        montantLoyer: Number(value.montantLoyer),
        dateEcheance: Number(value.dateEcheance),
        dateEntree: value.dateEntree ? new Date(value.dateEntree) : null,
        actif: true,
        etatDesLieuxImages: [...this.etatDesLieuxImages],
      };

      if (this.editingId) {
        await this.locataireService.update(this.editingId, payload);
      } else {
        await this.locataireService.add(payload);
      }

      await this.router.navigate(['/locataires']);
    } catch (error: unknown) {
      console.error('Erreur lors de l\'ajout du locataire:', error);
      const errorCode = (error as { code?: string })?.code;
      this.errorMessage = errorCode === 'permission-denied'
        ? 'Acces refuse par Firestore. Mettez a jour les regles de securite du projet Firebase.'
        : 'Impossible d’ajouter le locataire.';
    } finally {
      this.loading = false;
    }
  }

  private formatDateInput(value: unknown): string {
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private findResidenceIdByAddress(address: string): string {
    return this.residences().find((residence) => residence.address === address)?.id ?? '';
  }

  private normalizeResidence(residence: Residence | string): Residence {
    if (typeof residence === 'string') {
      return {
        id: `legacy-${residence}`,
        address: residence,
        capacity: '',
        properties: [],
        images: [],
      };
    }

    return {
      id: residence.id,
      address: residence.address ?? '',
      capacity: residence.capacity ?? '',
      properties: [...(residence.properties ?? [])],
      images: [...(residence.images ?? [])],
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Impossible de lire l’image.'));
      reader.readAsDataURL(file);
    });
  }
}
