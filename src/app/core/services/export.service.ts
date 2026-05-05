import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { Locataire } from '../models/locataire.model';
import { Paiement } from '../models/paiement.model';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  exportCsv(filename: string, rows: Record<string, unknown>[]): void {
    const header = rows.length > 0 ? Object.keys(rows[0]) : [];
    const csvLines = [
      header.join(';'),
      ...rows.map((row) =>
        header.map((column) => this.escapeCsv(row[column])).join(';')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  }

  exportLocataires(locataires: Locataire[]): void {
    this.exportCsv(
      'locataires.csv',
      locataires.map((locataire) => ({
        nom: locataire.nom,
        telephone: locataire.telephone,
        logement: locataire.residenceAddress ?? locataire.adresse,
        capacite: locataire.residenceCapacity ?? '',
        montantLoyer: locataire.montantLoyer,
        dateEcheance: locataire.dateEcheance,
        actif: locataire.actif ? 'oui' : 'non',
      }))
    );
  }

  exportPaiements(paiements: Paiement[]): void {
    this.exportCsv(
      'paiements.csv',
      paiements.map((paiement) => ({
        locataireId: paiement.locataireId,
        mois: paiement.mois,
        annee: paiement.annee,
        montant: paiement.montant,
        statut: paiement.statut,
        datePaiement: this.formatDate(paiement.datePaiement),
      }))
    );
  }

  generateReceiptPdf(locataire: Locataire, paiement: Paiement): void {
    const document = new jsPDF();
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    let yPosition = 15;

    // Header - Title
    document.setFontSize(24);
    document.setTextColor(41, 128, 185); // Professional blue
    document.text('Reçu de Paiement', 20, yPosition);
    yPosition += 15;

    // Separator line
    document.setDrawColor(41, 128, 185);
    document.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    // Receipt Info Box
    document.setFontSize(10);
    document.setTextColor(100, 100, 100);
    document.text(`Reçu N°: ${paiement.id ?? 'N/A'}`, 20, yPosition);
    document.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2 + 10, yPosition);
    yPosition += 10;

    // Main Content Sections
    document.setFontSize(11);
    document.setTextColor(0, 0, 0);

    // Section: Tenant Info
    document.setFont('', 'bold');
    document.text('Informations du Locataire', 20, yPosition);
    document.setFont('', 'normal');
    yPosition += 7;

    document.setFontSize(10);
    document.setTextColor(80, 80, 80);
    const tenantLines = [
      `Nom: ${locataire.nom}`,
      `Adresse: ${locataire.residenceAddress ?? locataire.adresse}`,
      locataire.residenceCapacity ? `Capacité: ${locataire.residenceCapacity}` : null,
      `Montant du loyer: ${this.formatCurrency(locataire.montantLoyer)}`,
    ].filter(Boolean);

    tenantLines.forEach((line) => {
      document.text(line as string, 25, yPosition);
      yPosition += 6;
    });
    yPosition += 5;

    // Section: Payment Details
    document.setFont('', 'bold');
    document.setTextColor(0, 0, 0);
    document.setFontSize(11);
    document.text('Détails du Paiement', 20, yPosition);
    document.setFont('', 'normal');
    yPosition += 7;

    const paymentDetails = [
      { label: 'Période', value: `${paiement.mois.toString().padStart(2, '0')}/${paiement.annee}` },
      { label: 'Montant Payé', value: this.formatCurrency(paiement.montant) },
      { label: 'Date de Paiement', value: this.formatDate(paiement.datePaiement) },
      { label: 'Statut', value: paiement.statut },
    ];

    const labelWidth = 40;
    document.setFontSize(10);
    document.setTextColor(80, 80, 80);

    paymentDetails.forEach(({ label, value }) => {
      document.setFont('', 'bold');
      document.setTextColor(60, 60, 60);
      document.text(label + ':', 25, yPosition);
      document.setFont('', 'normal');
      document.setTextColor(0, 0, 0);
      document.text(value, 25 + labelWidth, yPosition);
      yPosition += 7;
    });

    // Add notes if present
    if (paiement.notes) {
      yPosition += 5;
      document.setFont('', 'bold');
      document.setTextColor(0, 0, 0);
      document.setFontSize(11);
      document.text('Notes', 20, yPosition);
      document.setFont('', 'normal');
      yPosition += 6;

      const notesWidth = pageWidth - 40;
      const splitNotes = document.splitTextToSize(paiement.notes, notesWidth);
      document.setFontSize(10);
      document.setTextColor(80, 80, 80);
      splitNotes.forEach((line: string) => {
        document.text(line, 25, yPosition);
        yPosition += 5;
      });
    }

    // Footer
    yPosition = pageHeight - 20;
    document.setDrawColor(200, 200, 200);
    document.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 6;

    document.setFontSize(9);
    document.setTextColor(120, 120, 120);
    document.text('Ce reçu est généré automatiquement par le système de gestion de location.', pageWidth / 2, yPosition, { align: 'center' });

    // Save document
    document.save(`recu-${locataire.nom}-${paiement.mois}-${paiement.annee}.pdf`);
  }

  private formatDate(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
  }

  private formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(Number(value || 0))} DT`;
  }

  private escapeCsv(value: unknown): string {
    const normalized = value === null || value === undefined ? '' : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  }
}
