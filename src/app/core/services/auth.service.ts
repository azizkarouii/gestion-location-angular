import { computed, inject, Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  createUserWithEmailAndPassword,
  updateEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);

  readonly user = toSignal(authState(this.auth), { initialValue: null as User | null });
  readonly userId = computed(() => this.user()?.uid ?? null);
  readonly isLoggedIn = computed(() => !!this.user());

  async signUp(email: string, password: string, displayName?: string): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);

    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    return credential;
  }

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async updateDisplayName(displayName: string): Promise<void> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté.');
    }

    await updateProfile(currentUser, { displayName });
  }

  async updateEmailAddress(email: string): Promise<void> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté.');
    }

    await updateEmail(currentUser, email);
  }

  logout() {
    return signOut(this.auth);
  }
}
