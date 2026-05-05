import { DatePipe, NgFor, NgIf } from '@angular/common';
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
  selector: 'app-historique-paiements',
  standalone: true,
  imports: [NgIf, NgFor, DatePipe, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './historique-paiements.component.html',
  styleUrl: './historique-paiements.component.css'
})
export class HistoriquePaiementsComponent {
  private readonly authService = inject(AuthService);
  private readonly locataireService = inject(LocataireService);
  private readonly paiementService = inject(PaiementService);
  private readonly exportService = inject(ExportService);

  readonly monthFilter = signal(new Date().getMonth() + 1);
  readonly yearFilter = signal(new Date().getFullYear());

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly locataires = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.locataireService.list(ownerId) : of([] as Locataire[])))),
    { initialValue: [] as Locataire[] }
  );
  readonly paiements = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.paiementService.list(ownerId) : of([] as Paiement[])))),
    { initialValue: [] as Paiement[] }
  );

  readonly filteredPaiements = computed(() =>
    this.paiements().filter((paiement) => paiement.mois === this.monthFilter() && paiement.annee === this.yearFilter())
  );

  readonly totalMois = computed(() => this.filteredPaiements().reduce((total, paiement) => total + Number(paiement.montant || 0), 0));

  locataireNom(locataireId: string): string {
    return this.locataires().find((locataire) => locataire.id === locataireId)?.nom ?? 'Locataire inconnu';
  }

  statusClass(status: string): string {
    return status;
  }

  formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(Number(value || 0))} DT`;
  }

  exportCurrentMonth(): void {
    this.exportService.exportPaiements(this.filteredPaiements());
  }

  generateReceipt(paiement: Paiement): void {
    const locataire = this.locataires().find((item) => item.id === paiement.locataireId);
    if (!locataire) {
      return;
    }

    this.exportService.generateReceiptPdf(locataire, paiement);
  }

  deletePaiement(paiement: Paiement): void {
    const locataire = this.locataires().find((item) => item.id === paiement.locataireId);
    const locataireName = locataire?.nom ?? 'Locataire inconnu';
    const confirmDelete = confirm(`Êtes-vous sûr de vouloir supprimer ce paiement de ${locataireName} pour le mois ${paiement.mois}/${paiement.annee}?\n\nCette action est irréversible.`);
    
    if (confirmDelete && paiement.id) {
      this.paiementService.remove(paiement.id);
    }
  }
}
