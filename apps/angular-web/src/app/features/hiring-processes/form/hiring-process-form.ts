import { Component, effect, inject, input, output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import {
  CURRENCY_VALUES,
  DEFAULT_HIRING_PROCESS_STATUS,
  HIRING_PROCESS_STATUS_INFO,
  HIRING_PROCESS_STATUS_ORDER,
  SALARY_RATE_TYPE_VALUES,
  type Currency,
  type HiringProcessStatus,
  type SalaryRateType,
} from "@interviews-tool/domain/constants";
import {
  createHiringProcessSchema,
  type CreateHiringProcess,
} from "@interviews-tool/domain/schemas";
import type { HiringProcess } from "../../../core/api/hiring-process.model";

@Component({
  selector: "app-hiring-process-form",
  imports: [ReactiveFormsModule],
  template: `
    <form class="card flex flex-col gap-4" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div>
        <label class="label" for="companyName">Company name</label>
        <input id="companyName" class="input" formControlName="companyName" [attr.aria-invalid]="invalid('companyName')" />
        @if (errorOf('companyName'); as message) {
          <p class="field-error">{{ message }}</p>
        }
      </div>

      <div>
        <label class="label" for="jobTitle">Job title</label>
        <input id="jobTitle" class="input" formControlName="jobTitle" placeholder="Frontend Developer" />
      </div>

      <div>
        <label class="label" for="status">Status</label>
        <select id="status" class="input" formControlName="status">
          @for (s of statuses; track s) {
            <option [value]="s">{{ statusInfo[s].label }}</option>
          }
        </select>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="label" for="salary">Salary</label>
          <input id="salary" type="number" class="input" formControlName="salary" [attr.aria-invalid]="invalid('salary')" />
          @if (errorOf('salary'); as message) {
            <p class="field-error">{{ message }}</p>
          }
        </div>
        <div>
          <label class="label" for="currency">Currency</label>
          <select id="currency" class="input" formControlName="currency">
            @for (c of currencies; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>
        <div>
          <label class="label" for="salaryRateType">Rate</label>
          <select id="salaryRateType" class="input" formControlName="salaryRateType">
            @for (r of rateTypes; track r) {
              <option [value]="r">{{ r }}</option>
            }
          </select>
        </div>
      </div>

      @if (serverError()) {
        <p class="field-error" role="alert">{{ serverError() }}</p>
      }

      <div class="flex justify-end gap-2">
        <ng-content select="[cancel]" />
        <button type="submit" class="btn btn-primary" [disabled]="submitting()">
          {{ submitting() ? "Saving…" : submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class HiringProcessForm {
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly initial = input<HiringProcess | null>(null);
  readonly submitting = input(false);
  readonly serverError = input<string | null>(null);
  readonly submitLabel = input("Save");
  readonly save = output<CreateHiringProcess>();

  protected readonly statuses = HIRING_PROCESS_STATUS_ORDER;
  protected readonly statusInfo = HIRING_PROCESS_STATUS_INFO;
  protected readonly currencies = CURRENCY_VALUES;
  protected readonly rateTypes = SALARY_RATE_TYPE_VALUES;

  protected readonly form = this.fb.group({
    companyName: ["", [Validators.required]],
    jobTitle: [""],
    status: [DEFAULT_HIRING_PROCESS_STATUS as HiringProcessStatus, [Validators.required]],
    salary: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    currency: ["USD" as Currency],
    salaryRateType: ["monthly" as SalaryRateType],
  });

  constructor() {
    // Prefill when editing. Runs again if `initial` changes (e.g. query resolves later).
    effect(() => {
      const value = this.initial();
      if (!value) return;
      this.form.reset({
        companyName: value.companyName,
        jobTitle: value.jobTitle ?? "",
        status: value.status,
        salary: value.salary,
        currency: value.currency,
        salaryRateType: value.salaryRateType,
      });
    });
  }

  protected invalid(name: "companyName" | "salary"): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected errorOf(name: "companyName" | "salary"): string | null {
    const control = this.form.controls[name];
    if (!this.invalid(name)) return null;
    if (control.hasError("required")) return "Company name is required";
    if (control.hasError("min")) return "Salary must be positive";
    if (control.hasError("zod")) return control.getError("zod") as string;
    return "Invalid value";
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const salary = raw.salary === null || Number.isNaN(raw.salary) ? undefined : Number(raw.salary);
    const candidate: CreateHiringProcess = {
      companyName: raw.companyName.trim(),
      status: raw.status,
      ...(raw.jobTitle.trim() ? { jobTitle: raw.jobTitle.trim() } : {}),
      ...(salary !== undefined
        ? { salary, currency: raw.currency, salaryRateType: raw.salaryRateType }
        : {}),
    };

    // Same schema the server validates with — errors land on the matching control.
    const parsed = createHiringProcessSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof this.form.controls | undefined;
        if (key && key in this.form.controls) {
          this.form.controls[key].setErrors({ zod: issue.message });
          this.form.controls[key].markAsTouched();
        }
      }
      return;
    }
    this.save.emit(parsed.data);
  }
}
