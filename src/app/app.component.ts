import {
  AfterViewInit,
  Component,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { DialogService } from './services/dialog.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  title = 'money-split-frontend';
  @ViewChild('dialogContainer', { read: ViewContainerRef })
  dialogContainer!: ViewContainerRef;

  constructor(private dialogService: DialogService) {}

  ngAfterViewInit() {
    this.dialogService.setContainer(this.dialogContainer);
  }
}
