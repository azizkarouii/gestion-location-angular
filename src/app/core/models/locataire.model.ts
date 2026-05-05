export interface Locataire {
  id?: string;
  ownerId: string;           // lié au propriétaire connecté
  residenceId?: string;
  residenceAddress?: string;
  residenceCapacity?: string;
  residenceProperties?: string[];
  residenceImages?: string[];
  nom: string;
  telephone: string;
  montantLoyer: number;
  dateEcheance: number;      // jour du mois (ex: 5 = le 5 de chaque mois)
  etatDesLieux?: string;
  etatDesLieuxImages?: string[];
  adresse: string;
  dateEntree: any;           // Timestamp Firebase
  actif: boolean;
  createdAt: any;
}