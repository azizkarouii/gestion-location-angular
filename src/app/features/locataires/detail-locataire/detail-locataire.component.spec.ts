import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailLocataireComponent } from './detail-locataire.component';

describe('DetailLocataireComponent', () => {
  let component: DetailLocataireComponent;
  let fixture: ComponentFixture<DetailLocataireComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailLocataireComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailLocataireComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
