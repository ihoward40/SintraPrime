import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, CheckCircle2, AlertTriangle, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { validateEIN, validateSSN, validateDollarAmount, formatEIN, formatSSN, type ValidationResult } from "@/lib/validation";

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: string;
  extractedData: Record<string, any>;
  ocrText: string;
  onSave: (data: Record<string, any>) => void;
  onReject: () => void;
}

export function DocumentPreview({
  isOpen,
  onClose,
  documentType,
  extractedData,
  ocrText,
  onSave,
  onReject,
}: DocumentPreviewProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(extractedData);
  const [showOcrText, setShowOcrText] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      const newErrors = { ...validationErrors };
      delete newErrors[field];
      setValidationErrors(newErrors);
    }
  };

  const validateField = (field: string, value: any): ValidationResult => {
    // EIN validation
    if (field === "employerEIN" || field === "ein") {
      return validateEIN(value);
    }
    
    // SSN validation
    if (field === "employeeSSN" || field === "ssn" || field === "recipientSSN") {
      return validateSSN(value);
    }
    
    // Dollar amount validation
    if (field.includes("wages") || field.includes("withholding") || field.includes("income") || field.includes("amount")) {
      // Convert cents to dollars for validation
      const dollarAmount = typeof value === "number" ? value / 100 : parseFloat(value) || 0;
      return validateDollarAmount(dollarAmount, { fieldName: field });
    }
    
    return { valid: true };
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    
    Object.entries(formData).forEach(([field, value]) => {
      if (value) {
        const result = validateField(field, value);
        if (!result.valid && result.error) {
          errors[field] = result.error;
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    // Validate all fields before saving
    if (!validateAllFields()) {
      toast.error("Please fix validation errors before saving");
      return;
    }
    
    onSave(formData);
    toast.success("Document data saved successfully");
    onClose();
  };

  const handleReject = () => {
    onReject();
    toast.error("Document rejected");
    onClose();
  };

  const formatFieldName = (field: string): string => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      // Convert cents to dollars for display
      if (Math.abs(value) > 1000) {
        return `$${(value / 100).toFixed(2)}`;
      }
      return value.toString();
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value.toString();
  };

  const renderW2Fields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employerName">Employer Name</Label>
          <Input
            id="employerName"
            value={formData.employerName || ""}
            onChange={(e) => handleFieldChange("employerName", e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div>
          <Label htmlFor="employerEin">Employer EIN</Label>
          <Input
            id="employerEin"
            value={formData.employerEin || ""}
            onChange={(e) => handleFieldChange("employerEin", e.target.value)}
            disabled={!editMode}
            className={validationErrors.employerEin ? "border-red-500" : ""}
          />
          {validationErrors.employerEin && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.employerEin}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employeeName">Employee Name</Label>
          <Input
            id="employeeName"
            value={formData.employeeName || ""}
            onChange={(e) => handleFieldChange("employeeName", e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div>
          <Label htmlFor="employeeSsn">Employee SSN</Label>
          <Input
            id="employeeSsn"
            value={formData.employeeSsn || ""}
            onChange={(e) => handleFieldChange("employeeSsn", e.target.value)}
            disabled={!editMode}
            className={validationErrors.employeeSsn ? "border-red-500" : ""}
          />
          {validationErrors.employeeSsn && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.employeeSsn}</p>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="wagesInCents">Wages (Box 1)</Label>
          <Input
            id="wagesInCents"
            type="number"
            value={formData.wagesInCents ? formData.wagesInCents / 100 : ""}
            onChange={(e) => handleFieldChange("wagesInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="federalWithheldInCents">Federal Tax Withheld (Box 2)</Label>
          <Input
            id="federalWithheldInCents"
            type="number"
            value={formData.federalWithheldInCents ? formData.federalWithheldInCents / 100 : ""}
            onChange={(e) => handleFieldChange("federalWithheldInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="socialSecurityWagesInCents">SS Wages (Box 3)</Label>
          <Input
            id="socialSecurityWagesInCents"
            type="number"
            value={formData.socialSecurityWagesInCents ? formData.socialSecurityWagesInCents / 100 : ""}
            onChange={(e) => handleFieldChange("socialSecurityWagesInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="socialSecurityTaxInCents">SS Tax Withheld (Box 4)</Label>
          <Input
            id="socialSecurityTaxInCents"
            type="number"
            value={formData.socialSecurityTaxInCents ? formData.socialSecurityTaxInCents / 100 : ""}
            onChange={(e) => handleFieldChange("socialSecurityTaxInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="medicareWagesInCents">Medicare Wages (Box 5)</Label>
          <Input
            id="medicareWagesInCents"
            type="number"
            value={formData.medicareWagesInCents ? formData.medicareWagesInCents / 100 : ""}
            onChange={(e) => handleFieldChange("medicareWagesInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="medicareTaxInCents">Medicare Tax Withheld (Box 6)</Label>
          <Input
            id="medicareTaxInCents"
            type="number"
            value={formData.medicareTaxInCents ? formData.medicareTaxInCents / 100 : ""}
            onChange={(e) => handleFieldChange("medicareTaxInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="stateWagesInCents">State Wages</Label>
          <Input
            id="stateWagesInCents"
            type="number"
            value={formData.stateWagesInCents ? formData.stateWagesInCents / 100 : ""}
            onChange={(e) => handleFieldChange("stateWagesInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="stateWithheldInCents">State Tax Withheld</Label>
          <Input
            id="stateWithheldInCents"
            type="number"
            value={formData.stateWithheldInCents ? formData.stateWithheldInCents / 100 : ""}
            onChange={(e) => handleFieldChange("stateWithheldInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
      </div>
    </>
  );

  const render1099Fields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="payerName">Payer Name</Label>
          <Input
            id="payerName"
            value={formData.payerName || ""}
            onChange={(e) => handleFieldChange("payerName", e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div>
          <Label htmlFor="payerEin">Payer EIN</Label>
          <Input
            id="payerEin"
            value={formData.payerEin || ""}
            onChange={(e) => handleFieldChange("payerEin", e.target.value)}
            disabled={!editMode}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="recipientName">Recipient Name</Label>
          <Input
            id="recipientName"
            value={formData.recipientName || ""}
            onChange={(e) => handleFieldChange("recipientName", e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div>
          <Label htmlFor="recipientTin">Recipient TIN</Label>
          <Input
            id="recipientTin"
            value={formData.recipientTin || ""}
            onChange={(e) => handleFieldChange("recipientTin", e.target.value)}
            disabled={!editMode}
          />
        </div>
      </div>

      <Separator />

      {documentType === "1099-int" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="interestIncomeInCents">Interest Income (Box 1)</Label>
            <Input
              id="interestIncomeInCents"
              type="number"
              value={formData.interestIncomeInCents ? formData.interestIncomeInCents / 100 : ""}
              onChange={(e) => handleFieldChange("interestIncomeInCents", Math.round(parseFloat(e.target.value) * 100))}
              disabled={!editMode}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="federalWithheldInCents">Federal Tax Withheld (Box 4)</Label>
            <Input
              id="federalWithheldInCents"
              type="number"
              value={formData.federalWithheldInCents ? formData.federalWithheldInCents / 100 : ""}
              onChange={(e) => handleFieldChange("federalWithheldInCents", Math.round(parseFloat(e.target.value) * 100))}
              disabled={!editMode}
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      {documentType === "1099-div" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ordinaryDividendsInCents">Ordinary Dividends (Box 1a)</Label>
            <Input
              id="ordinaryDividendsInCents"
              type="number"
              value={formData.ordinaryDividendsInCents ? formData.ordinaryDividendsInCents / 100 : ""}
              onChange={(e) => handleFieldChange("ordinaryDividendsInCents", Math.round(parseFloat(e.target.value) * 100))}
              disabled={!editMode}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="qualifiedDividendsInCents">Qualified Dividends (Box 1b)</Label>
            <Input
              id="qualifiedDividendsInCents"
              type="number"
              value={formData.qualifiedDividendsInCents ? formData.qualifiedDividendsInCents / 100 : ""}
              onChange={(e) => handleFieldChange("qualifiedDividendsInCents", Math.round(parseFloat(e.target.value) * 100))}
              disabled={!editMode}
              placeholder="0.00"
            />
          </div>
        </div>
      )}
    </>
  );

  const renderK1Fields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entityName">Entity Name</Label>
          <Input
            id="entityName"
            value={formData.entityName || ""}
            onChange={(e) => handleFieldChange("entityName", e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div>
          <Label htmlFor="entityEin">Entity EIN</Label>
          <Input
            id="entityEin"
            value={formData.entityEin || ""}
            onChange={(e) => handleFieldChange("entityEin", e.target.value)}
            disabled={!editMode}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="partnerName">Partner/Beneficiary Name</Label>
          <Input
            id="partnerName"
            value={formData.partnerName || ""}
            onChange={(e) => handleFieldChange("partnerName", e.target.value)}
            disabled={!editMode}
          />
        </div>
        <div>
          <Label htmlFor="partnerSsn">Partner/Beneficiary SSN</Label>
          <Input
            id="partnerSsn"
            value={formData.partnerSsn || ""}
            onChange={(e) => handleFieldChange("partnerSsn", e.target.value)}
            disabled={!editMode}
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="ordinaryIncomeInCents">Ordinary Income (Box 1)</Label>
          <Input
            id="ordinaryIncomeInCents"
            type="number"
            value={formData.ordinaryIncomeInCents ? formData.ordinaryIncomeInCents / 100 : ""}
            onChange={(e) => handleFieldChange("ordinaryIncomeInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="guaranteedPaymentsInCents">Guaranteed Payments (Box 4a)</Label>
          <Input
            id="guaranteedPaymentsInCents"
            type="number"
            value={formData.guaranteedPaymentsInCents ? formData.guaranteedPaymentsInCents / 100 : ""}
            onChange={(e) => handleFieldChange("guaranteedPaymentsInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="capitalGainsInCents">Capital Gains (Box 9a)</Label>
          <Input
            id="capitalGainsInCents"
            type="number"
            value={formData.capitalGainsInCents ? formData.capitalGainsInCents / 100 : ""}
            onChange={(e) => handleFieldChange("capitalGainsInCents", Math.round(parseFloat(e.target.value) * 100))}
            disabled={!editMode}
            placeholder="0.00"
          />
        </div>
      </div>
    </>
  );

  const renderGenericFields = () => (
    <div className="space-y-4">
      {Object.entries(formData).map(([key, value]) => (
        <div key={key}>
          <Label htmlFor={key}>{formatFieldName(key)}</Label>
          <Input
            id={key}
            value={formatFieldValue(value)}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            disabled={!editMode}
          />
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Preview: {documentType.toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                Review and verify the extracted data before saving
              </DialogDescription>
            </div>
            <Badge variant={editMode ? "default" : "outline"}>
              {editMode ? "Edit Mode" : "View Mode"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Extracted Data Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extracted Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentType === "w2" && renderW2Fields()}
              {documentType.startsWith("1099") && render1099Fields()}
              {(documentType === "k1" || documentType === "k1-1041") && renderK1Fields()}
              {!["w2", "1099-int", "1099-div", "k1", "k1-1041"].includes(documentType) && renderGenericFields()}
            </CardContent>
          </Card>

          {/* OCR Text Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Raw OCR Text</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOcrText(!showOcrText)}
                >
                  {showOcrText ? "Hide" : "Show"}
                </Button>
              </div>
            </CardHeader>
            {showOcrText && (
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-60">
                  {ocrText}
                </pre>
              </CardContent>
            )}
          </Card>

          {/* Validation Warnings */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Review Required</p>
                  <p className="text-xs mt-1">
                    Please verify all extracted values are correct. OCR extraction may have errors.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReject}>
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel Edit
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleSave}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve & Save
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
