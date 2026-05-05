import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ExportService } from '../../../core/services/export.service';
import { LocataireService } from '../../../core/services/locataire.service';
import { PaiementService } from '../../../core/services/paiement.service';
import { Locataire } from '../../../core/models/locataire.model';
import { Paiement } from '../../../core/models/paiement.model';

@Component({
  selector: 'app-list-locataires',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './list-locataires.component.html',
  styleUrl: './list-locataires.component.css'
})
export class ListLocatairesComponent {
  private readonly authService = inject(AuthService);
  private readonly locataireService = inject(LocataireService);
  private readonly paiementService = inject(PaiementService);
  private readonly exportService = inject(ExportService);

  readonly searchText = signal('');
  readonly filterMode = signal<'all' | 'actifs' | 'inactifs' | 'retards' | 'loyers'>('all');

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly locataires = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.locataireService.list(ownerId) : of([] as Locataire[])))),
    { initialValue: [] as Locataire[] }
  );
  readonly paiements = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.paiementService.list(ownerId) : of([] as Paiement[])))),
    { initialValue: [] as Paiement[] }
  );

  readonly filteredLocataires = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const mode = this.filterMode();
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    return this.locataires().filter((locataire) => {
      const currentPayment = this.currentPayment(locataire.id ?? '');
      const status = this.paiementService.computeStatut(locataire, currentPayment);
      const matchesSearch = !search || locataire.nom.toLowerCase().includes(search);
      const matchesFilter =
        mode === 'all' ||
        (mode === 'actifs' && locataire.actif) ||
        (mode === 'inactifs' && !locataire.actif) ||
        (mode === 'retards' && status === 'en_retard') ||
        (mode === 'loyers' && Number(locataire.montantLoyer) >= 150000);

      return matchesSearch && matchesFilter;
    });
  });

  readonly lateCount = computed(() =>
    this.locataires().filter((locataire) => this.paiementService.computeStatut(locataire, this.currentPayment(locataire.id ?? '')) === 'en_retard').length
  );

  currentPayment(locataireId: string): Paiement | null {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    return this.paiements().find((paiement) => paiement.locataireId === locataireId && paiement.mois === currentMonth && paiement.annee === currentYear) ?? null;
  }

  statusLabel(locataire: Locataire): string {
    return this.paiementService.computeStatut(locataire, this.currentPayment(locataire.id ?? ''));
  }

  async archive(locataire: Locataire): Promise<void> {
    if (!locataire.id) {
      return;
    }

    await this.locataireService.archive(locataire.id, !locataire.actif);
  }

  async remove(locataire: Locataire): Promise<void> {
    if (!locataire.id) {
      return;
    }

    const confirmed = window.confirm(`Supprimer ${locataire.nom} ?`);
    if (!confirmed) {
      return;
    }

    await this.locataireService.remove(locataire.id);
  }

  exportLocataires(): void {
    this.exportService.exportLocataires(this.filteredLocataires());
  }

  trackById(_: number, locataire: Locataire): string | undefined {
    return locataire.id;
  }

  formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(Number(value || 0))} DT`;
  }
}
