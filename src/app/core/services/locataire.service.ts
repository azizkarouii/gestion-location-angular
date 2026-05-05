import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { Locataire } from '../models/locataire.model';

@Injectable({
  providedIn: 'root'
})
export class LocataireService {
  private readonly firestore = inject(Firestore);

  list(ownerId: string): Observable<Locataire[]> {
    const locatairesRef = collection(this.firestore, 'locataires');
    const locatairesQuery = query(locatairesRef, where('ownerId', '==', ownerId));

    return (collectionData(locatairesQuery, { idField: 'id' }) as Observable<Locataire[]>).pipe(
      map((locataires) =>
        [...locataires].sort((a, b) => this.toMillis(b.createdAt) - this.toMillis(a.createdAt))
      )
    );
  }

  async add(locataire: Omit<Locataire, 'id' | 'createdAt'>): Promise<void> {
    const locatairesRef = collection(this.firestore, 'locataires');
    await addDoc(locatairesRef, {
      ...locataire,
      createdAt: new Date(),
    });
  }

  getById(id: string): Observable<Locataire | undefined> {
    const locataireRef = doc(this.firestore, `locataires/${id}`);
    return docData(locataireRef, { idField: 'id' }) as Observable<Locataire | undefined>;
  }

  async update(id: string, locataire: Partial<Locataire>): Promise<void> {
    const locataireRef = doc(this.firestore, `locataires/${id}`);
    await updateDoc(locataireRef, locataire as any);
  }

  async remove(id: string): Promise<void> {
    const locataireRef = doc(this.firestore, `locataires/${id}`);
    await deleteDoc(locataireRef);
  }

  async archive(id: string, actif: boolean): Promise<void> {
    await this.update(id, { actif });
  }

  filterBySearch(locataires: Locataire[], searchText: string): Locataire[] {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return locataires;
    }

    return locataires.filter((locataire) =>
      locataire.nom.toLowerCase().includes(normalizedSearch)
    );
  }

  private toMillis(value: unknown): number {
    if (!value) {
      return 0;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (typeof maybeTimestamp.toDate === 'function') {
        return maybeTimestamp.toDate().getTime();
      }
    }

    const parsed = new Date(value as string | number);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
}
