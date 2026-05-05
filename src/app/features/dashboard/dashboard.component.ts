import { AfterViewInit, Component, ElementRef, ViewChild, computed, effect, inject } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LocataireService } from '../../core/services/locataire.service';
import { PaiementService } from '../../core/services/paiement.service';
import { NotificationService } from '../../core/services/notification.service';
import { Locataire } from '../../core/models/locataire.model';
import { Paiement } from '../../core/models/paiement.model';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly locataireService = inject(LocataireService);
  private readonly paiementService = inject(PaiementService);
  private readonly notificationService = inject(NotificationService);

  private readonly ownerId$ = toObservable(this.authService.userId);
  readonly locataires = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.locataireService.list(ownerId) : of([] as Locataire[])))),
    { initialValue: [] as Locataire[] }
  );
  readonly paiements = toSignal(
    this.ownerId$.pipe(switchMap((ownerId) => (ownerId ? this.paiementService.list(ownerId) : of([] as Paiement[])))),
    { initialValue: [] as Paiement[] }
  );

  readonly activeLocatairesList = computed(() => this.locataires().filter((locataire) => locataire.actif));
  readonly activeLocataires = computed(() => this.activeLocatairesList().length);
  readonly totalLoyersMensuels = computed(() =>
    this.locataires()
      .filter((locataire) => locataire.actif)
      .reduce((total, locataire) => total + Number(locataire.montantLoyer || 0), 0)
  );

  readonly currentMonth = new Date().getMonth() + 1;
  readonly currentYear = new Date().getFullYear();

  readonly currentMonthPayments = computed(() =>
    this.paiements().filter((paiement) => paiement.mois === this.currentMonth && paiement.annee === this.currentYear)
  );

  readonly paidThisMonth = computed(() =>
    this.currentMonthPayments().filter((paiement) => paiement.statut === 'payé').length
  );

  readonly lateLocataires = computed(() =>
    this.locataires().filter((locataire) => {
      const currentPayment = this.currentMonthPayments().find((paiement) => paiement.locataireId === locataire.id);
      return locataire.actif && this.paiementService.computeStatut(locataire, currentPayment) === 'en_retard';
    })
  );

  readonly waitingLocataires = computed(() =>
    this.locataires().filter((locataire) => {
      const currentPayment = this.currentMonthPayments().find((paiement) => paiement.locataireId === locataire.id);
      return locataire.actif && this.paiementService.computeStatut(locataire, currentPayment) === 'en_attente';
    })
  );

  readonly recoveryRate = computed(() => {
    const active = this.activeLocataires();
    if (!active) {
      return 0;
    }

    return Math.round((this.paidThisMonth() / active) * 100);
  });

  @ViewChild('revenueChart') revenueChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef?: ElementRef<HTMLCanvasElement>;

  private revenueChart?: Chart;
  private statusChart?: Chart;
  selectedStatModal: 'loyers' | 'actifs' | 'retards' | 'recouvrement' | null = null;

  constructor() {
    effect(() => {
      this.locataires();
      this.paiements();
      queueMicrotask(() => this.renderCharts());

      if (this.lateLocataires().length > 0) {
        this.notificationService.push(
          'warning',
          'Retards détectés',
          `${this.lateLocataires().length} locataire(s) sont en retard ce mois-ci.`
        );
      }
    });
  }

  ngAfterViewInit(): void {
    this.renderCharts();
  }

  private renderCharts(): void {
    const revenueCanvas = this.revenueChartRef?.nativeElement;
    const statusCanvas = this.statusChartRef?.nativeElement;

    if (!revenueCanvas || !statusCanvas) {
      return;
    }

    this.revenueChart?.destroy();
    this.statusChart?.destroy();

    const monthlyRevenue = this.buildMonthlyRevenue();
    const statusDistribution = this.buildStatusDistribution();

    this.revenueChart = new Chart(revenueCanvas, {
      type: 'bar',
      data: {
        labels: monthlyRevenue.map((item) => item.label),
        datasets: [
          {
            label: 'Revenus',
            data: monthlyRevenue.map((item) => item.value),
            backgroundColor: '#0f766e',
            borderRadius: 12,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });

    this.statusChart = new Chart(statusCanvas, {
      type: 'pie',
      data: {
        labels: statusDistribution.map((item) => item.label),
        datasets: [
          {
            data: statusDistribution.map((item) => item.value),
            backgroundColor: ['#16a34a', '#dc2626', '#f59e0b'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }

  private buildMonthlyRevenue(): Array<{ label: string; value: number }> {
    const months = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
    ];

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const value = this.paiements()
        .filter((paiement) => paiement.mois === month && paiement.annee === year && paiement.statut === 'payé')
        .reduce((total, paiement) => total + Number(paiement.montant || 0), 0);

      return {
        label: `${months[month - 1]} ${String(year).slice(2)}`,
        value,
      };
    });
  }

  private buildStatusDistribution(): Array<{ label: string; value: number }> {
    return [
      { label: 'Payé', value: this.paidThisMonth() },
      { label: 'En retard', value: this.lateLocataires().length },
      { label: 'En attente', value: this.waitingLocataires().length },
    ];
  }

  formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(Number(value || 0))} DT`;
  }

  openStatDetails(stat: 'loyers' | 'actifs' | 'retards' | 'recouvrement'): void {
    this.selectedStatModal = stat;
  }

  closeStatDetails(): void {
    this.selectedStatModal = null;
  }

  onStatCardKeydown(event: KeyboardEvent, stat: 'loyers' | 'actifs' | 'retards' | 'recouvrement'): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openStatDetails(stat);
    }
  }

  statModalTitle(): string {
    switch (this.selectedStatModal) {
      case 'loyers':
        return 'Détail des loyers du mois';
      case 'actifs':
        return 'Locataires actifs';
      case 'retards':
        return 'Paiements en retard';
      case 'recouvrement':
        return 'Taux de recouvrement';
      default:
        return 'Détail';
    }
  }

  monthLabel(): string {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];

    return `${months[this.currentMonth - 1]} ${this.currentYear}`;
  }

  unpaidThisMonthLocataires(): Locataire[] {
    return this.activeLocatairesList().filter((locataire) => {
      const currentPayment = this.currentMonthPayments().find((paiement) => paiement.locataireId === locataire.id);
      return currentPayment?.statut !== 'payé';
    });
  }
}
