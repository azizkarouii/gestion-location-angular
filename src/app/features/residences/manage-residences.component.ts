import { NgFor, NgIf } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
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
  selector: 'app-manage-residences',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './manage-residences.component.html',
  styleUrl: './manage-residences.component.css'
})
export class ManageResidencesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly proprietaireService = inject(ProprietaireService);
  private residenceCounter = 0;

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly profile = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.proprietaireService.getByOwnerId(ownerId) : of(undefined as Proprietaire | undefined)))),
    { initialValue: undefined as Proprietaire | undefined }
  );

  readonly form = this.fb.nonNullable.group({
    address: ['', [Validators.required, Validators.minLength(3)]],
    capacity: ['', [Validators.required, Validators.minLength(2)]],
    propertiesText: [''],
  });

  residences: Residence[] = [];
  draftImages: string[] = [];
  editingIndex: number | null = null;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor() {
    effect(() => {
      const profile = this.profile();
      this.residences = (profile?.residences ?? []).map((residence) => this.normalizeResidence(residence));
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
    this.draftImages = [...this.draftImages, ...images];
  }

  removeDraftImage(index: number): void {
    this.draftImages = this.draftImages.filter((_, currentIndex) => currentIndex !== index);
  }

  editResidence(index: number): void {
    const residence = this.residences[index];
    if (!residence) {
      return;
    }

    this.editingIndex = index;
    this.draftImages = [...residence.images];
    this.form.patchValue({
      address: residence.address,
      capacity: residence.capacity,
      propertiesText: residence.properties.join(', '),
    });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.draftImages = [];
    this.form.reset({
      address: '',
      capacity: '',
      propertiesText: '',
    });
  }

  async saveResidence(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const previous = this.editingIndex !== null ? this.residences[this.editingIndex] : undefined;

    const residence: Residence = {
      id: previous?.id ?? this.createResidenceId(),
      address: value.address.trim(),
      capacity: value.capacity.trim(),
      properties: value.propertiesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      images: [...this.draftImages],
      createdAt: previous?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    const nextResidences = this.editingIndex === null
      ? [...this.residences, residence]
      : this.residences.map((item, index) => (index === this.editingIndex ? residence : item));

    await this.persistResidences(nextResidences);
    this.cancelEdit();
  }

  async removeResidence(index: number): Promise<void> {
    const nextResidences = this.residences.filter((_, currentIndex) => currentIndex !== index);
    await this.persistResidences(nextResidences);

    if (this.editingIndex === index) {
      this.cancelEdit();
    }
  }

  residencePropertiesText(residence: Residence): string {
    return residence.properties.length ? residence.properties.join(' · ') : 'Aucune propriété renseignée';
  }

  trackByResidenceId(_: number, residence: Residence): string {
    return residence.id;
  }

  private async persistResidences(residences: Residence[]): Promise<void> {
    const ownerId = this.authService.userId();
    if (!ownerId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const currentProfile = this.profile();

      if (currentProfile) {
        await this.proprietaireService.update(ownerId, { residences });
      } else {
        await this.proprietaireService.createOrUpdate({
          ownerId,
          nomComplet: this.authService.user()?.displayName ?? 'Propriétaire',
          email: this.authService.user()?.email ?? '',
          telephone: '',
          adresse: '',
          residences,
          createdAt: new Date(),
        });
      }

      this.residences = residences;
      this.successMessage = 'Maisons / appartements mis à jour.';
    } catch (error) {
      console.error('Erreur sauvegarde résidences:', error);
      this.errorMessage = 'Impossible de sauvegarder les maisons / appartements.';
    } finally {
      this.loading = false;
    }
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
}
