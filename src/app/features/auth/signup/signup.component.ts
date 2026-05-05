import { NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/services/auth.service';
import { ProprietaireService } from '../../../core/services/proprietaire.service';
import { Residence } from '../../../core/models/residence.model';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly proprietaireService = inject(ProprietaireService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', [Validators.required, Validators.minLength(8)]],
    adresse: ['', [Validators.required, Validators.minLength(3)]],
    residence: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  errorMessage = '';
  loading = false;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      void this.router.navigate(['/dashboard']);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    if (value.password !== value.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const credential = await this.authService.signUp(value.email, value.password, value.displayName);
      const userId = credential.user.uid;

      if (userId) {
        const initialResidence: Residence = {
          id: `res-${Date.now()}`,
          address: value.residence,
          capacity: '',
          properties: [],
          images: [],
          createdAt: new Date(),
        };

        await this.proprietaireService.createOrUpdate({
          ownerId: userId,
          nomComplet: value.displayName,
          email: value.email,
          telephone: value.telephone,
          adresse: value.adresse,
          residences: [initialResidence],
          createdAt: new Date(),
        });
      }

      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage = 'Inscription impossible. Vérifiez vos informations.';
    } finally {
      this.loading = false;
    }
  }
}
