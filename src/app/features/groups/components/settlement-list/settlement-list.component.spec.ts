import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettlementListComponent } from './settlement-list.component';

describe('SettlementListComponent', () => {
  let component: SettlementListComponent;
  let fixture: ComponentFixture<SettlementListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettlementListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettlementListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
