import { NgFor, NgIf } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { ProprietaireService } from '../../core/services/proprietaire.service';
import { Proprietaire } from '../../core/models/proprietaire.model';
import { Residence } from '../../core/models/residence.model';

@Component({
  selector: 'app-profil-proprietaire',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './profil-proprietaire.component.html',
  styleUrl: './profil-proprietaire.component.css'
})
export class ProfilProprietaireComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly proprietaireService = inject(ProprietaireService);
  private residenceCounter = 0;

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly profile = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.proprietaireService.getByOwnerId(ownerId) : of(undefined as Proprietaire | undefined)))),
    { initialValue: undefined as Proprietaire | undefined }
  );

  readonly initial = computed(() => (this.form.controls.nomComplet.value || this.authService.user()?.displayName || this.authService.user()?.email || 'P').slice(0, 1).toUpperCase());

  readonly form = this.fb.nonNullable.group({
    nomComplet: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
    adresse: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly residenceForm = this.fb.nonNullable.group({
    address: ['', [Validators.required, Validators.minLength(3)]],
    capacity: ['', [Validators.required, Validators.minLength(2)]],
    propertiesText: [''],
  });

  residences: Residence[] = [];
  residenceImages: string[] = [];
  editingResidenceIndex: number | null = null;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor() {
    effect(() => {
      const profile = this.profile();
      const currentUser = this.authService.user();

      if (!profile && !currentUser) {
        return;
      }

      this.form.patchValue({
        nomComplet: profile?.nomComplet ?? currentUser?.displayName ?? '',
        email: profile?.email ?? currentUser?.email ?? '',
        telephone: profile?.telephone ?? '',
        adresse: profile?.adresse ?? '',
      }, { emitEvent: false });

      this.residences = (profile?.residences ?? []).map((residence) => this.normalizeResidence(residence));
    });
  }

  startNewResidence(): void {
    this.editingResidenceIndex = null;
    this.residenceImages = [];
    this.residenceForm.reset({
      address: '',
      capacity: '',
      propertiesText: '',
    });
  }

  editResidence(index: number): void {
    const residence = this.residences[index];
    if (!residence) {
      return;
    }

    this.editingResidenceIndex = index;
    this.residenceImages = [...residence.images];
    this.residenceForm.patchValue({
      address: residence.address,
      capacity: residence.capacity,
      propertiesText: residence.properties.join(', '),
    });
  }

  async onResidenceImagesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) {
      return;
    }

    const images = await Promise.all(files.map((file) => this.fileToBase64(file)));
    this.residenceImages = [...this.residenceImages, ...images];
  }

  removeResidenceImage(index: number): void {
    this.residenceImages = this.residenceImages.filter((_, currentIndex) => currentIndex !== index);
  }

  saveResidence(): void {
    if (this.residenceForm.invalid) {
      this.residenceForm.markAllAsTouched();
      return;
    }

    const value = this.residenceForm.getRawValue();
    const residence: Residence = {
      id: this.editingResidenceIndex !== null ? this.residences[this.editingResidenceIndex]?.id ?? this.createResidenceId() : this.createResidenceId(),
      address: value.address.trim(),
      capacity: value.capacity.trim(),
      properties: value.propertiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      images: [...this.residenceImages],
      createdAt: this.editingResidenceIndex !== null ? this.residences[this.editingResidenceIndex]?.createdAt ?? new Date() : new Date(),
      updatedAt: new Date(),
    };

    if (this.editingResidenceIndex === null) {
      this.residences = [...this.residences, residence];
    } else {
      this.residences = this.residences.map((item, index) => (index === this.editingResidenceIndex ? residence : item));
    }

    this.startNewResidence();
  }

  removeResidence(index: number): void {
    this.residences = this.residences.filter((_, currentIndex) => currentIndex !== index);
    if (this.editingResidenceIndex === index) {
      this.startNewResidence();
    }
  }

  removeDraftResidenceImage(index: number): void {
    this.removeResidenceImage(index);
  }

  cancelResidenceEdit(): void {
    this.startNewResidence();
  }

  residenceLabel(residence: Residence): string {
    return `${residence.capacity || 'Logement'} - ${residence.address}`;
  }

  residencePropertiesText(residence: Residence): string {
    return residence.properties.length ? residence.properties.join(' · ') : 'Aucune propriété renseignée';
  }

  trackByResidenceId(_: number, residence: Residence): string {
    return residence.id;
  }

  private normalizeResidence(residence: Residence | string): Residence {
    if (typeof residence === 'string') {
      return {
        id: this.createResidenceId(),
        address: residence,
        capacity: '',
        properties: [],
        images: [],
        createdAt: new Date(),
      };
    }

    return {
      id: residence.id || this.createResidenceId(),
      address: residence.address ?? '',
      capacity: residence.capacity ?? '',
      properties: [...(residence.properties ?? [])],
      images: [...(residence.images ?? [])],
      createdAt: residence.createdAt ?? new Date(),
      updatedAt: residence.updatedAt,
    };
  }

  private createResidenceId(): string {
    this.residenceCounter += 1;
    return `res-${Date.now()}-${this.residenceCounter}`;
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Impossible de lire l’image.'));
      reader.readAsDataURL(file);
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

      if (!this.residences.length) {
      this.errorMessage = 'Ajoutez au moins une résidence.';
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      const ownerId = this.authService.userId();
      const value = this.form.getRawValue();

      if (!ownerId) {
        throw new Error('Aucun utilisateur connecté.');
      }

      if (value.email !== this.authService.user()?.email) {
        await this.authService.updateEmailAddress(value.email.trim());
      }

      await this.authService.updateDisplayName(value.nomComplet.trim());

      await this.proprietaireService.createOrUpdate({
        ownerId,
        nomComplet: value.nomComplet.trim(),
        email: value.email.trim(),
        telephone: value.telephone.trim(),
        adresse: value.adresse.trim(),
        residences: this.residences,
        createdAt: this.profile()?.createdAt ?? new Date(),
      });

      this.successMessage = 'Profil mis à jour avec succès.';
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      const errorCode = (error as { code?: string })?.code;
      this.errorMessage = errorCode === 'auth/requires-recent-login'
        ? 'Firebase demande une reconnexion récente pour changer l’email. Déconnectez-vous puis reconnectez-vous, puis réessayez.'
        : 'Impossible de mettre à jour le profil.';
    } finally {
      this.loading = false;
    }
  }
}
