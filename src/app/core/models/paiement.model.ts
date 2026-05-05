export type StatutPaiement = 'payé' | 'en_retard' | 'en_attente';

export interface Paiement {
  id?: string;
  locataireId: string;
  ownerId: string;
  mois: number;              // 1–12
  annee: number;
  montant: number;
  datePaiement?: any;        // Timestamp Firebase (null si pas encore payé)
  statut: StatutPaiement;
  reçuUrl?: string;          // URL du reçu généré
  notes?: string;
}