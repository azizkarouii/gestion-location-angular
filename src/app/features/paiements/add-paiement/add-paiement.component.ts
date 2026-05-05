import { NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LocataireService } from '../../../core/services/locataire.service';
import { PaiementService } from '../../../core/services/paiement.service';
import { Locataire } from '../../../core/models/locataire.model';

@Component({
  selector: 'app-add-paiement',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './add-paiement.component.html',
  styleUrl: './add-paiement.component.css'
})
export class AddPaiementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly locataireService = inject(LocataireService);
  private readonly paiementService = inject(PaiementService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    locataireId: ['', [Validators.required]],
    mois: [new Date().getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    annee: [new Date().getFullYear(), [Validators.required]],
    montant: [0, [Validators.required, Validators.min(0)]],
    datePaiement: [new Date().toISOString().slice(0, 10)],
    notes: [''],
  });

  errorMessage = '';
  loading = false;

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly locataires = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.locataireService.list(ownerId) : of([] as Locataire[])))),
    { initialValue: [] as Locataire[] }
  );

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/login']);
      return;
    }

    const locataireId = this.route.snapshot.queryParamMap.get('locataireId');
    if (locataireId) {
      this.form.patchValue({ locataireId });
      this.syncAmount();
    }
  }

  syncAmount(): void {
    const selected = this.locataires().find((locataire) => locataire.id === this.form.controls.locataireId.value);
    if (selected) {
      this.form.patchValue({ montant: selected.montantLoyer });
    }
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

    const selectedLocataire = this.locataires().find((locataire) => locataire.id === this.form.getRawValue().locataireId);
    if (!selectedLocataire) {
      this.errorMessage = 'Sélectionnez un locataire valide.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const value = this.form.getRawValue();
      
      // Validate date is not in future
      const selectedDate = value.datePaiement ? new Date(value.datePaiement) : null;
      if (selectedDate && selectedDate > new Date()) {
        this.errorMessage = 'La date de paiement ne peut pas être dans le futur.';
        this.loading = false;
        return;
      }

      // Check for duplicate payment
      const isDuplicate = await this.paiementService.checkDuplicate(ownerId, value.locataireId, Number(value.mois), Number(value.annee));
      if (isDuplicate) {
        this.errorMessage = `Un paiement existe déjà pour ${selectedLocataire.nom} pour le mois de ${value.mois}/${value.annee}. Un seul paiement par mois est autorisé.`;
        this.loading = false;
        return;
      }

      const datePaiement = selectedDate;
      const statut = this.paiementService.computeStatut(selectedLocataire, datePaiement ? { locataireId: value.locataireId, ownerId, mois: value.mois, annee: value.annee, montant: Number(value.montant), datePaiement, statut: 'payé' } : null);

      await this.paiementService.add({
        locataireId: value.locataireId,
        ownerId,
        mois: Number(value.mois),
        annee: Number(value.annee),
        montant: Number(value.montant),
        datePaiement,
        statut,
        ...(value.notes.trim() ? { notes: value.notes.trim() } : {}),
      });

      await this.router.navigate(['/paiements']);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      this.errorMessage = errorCode === 'permission-denied'
        ? 'Acces refuse par Firestore. Mettez a jour les regles de securite du projet Firebase.'
        : 'Impossible d’enregistrer le paiement.';
    } finally {
      this.loading = false;
    }
  }
}
