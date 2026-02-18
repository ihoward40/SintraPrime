import { useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Plus, X, GitBranch } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export type ConditionRule = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

export type ConditionGroup = {
  id: string;
  type: 'AND' | 'OR';
  rules: ConditionRule[];
};

type ConditionBuilderProps = {
  conditions: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
  triggerType: 'email_received' | 'audio_transcribed' | 'web_change_detected';
};

const FIELD_OPTIONS = {
  email_received: [
    { value: 'email.from', label: 'From Address' },
    { value: 'email.subject', label: 'Subject' },
    { value: 'email.body', label: 'Body' },
    { value: 'email.to', label: 'To Address' },
  ],
  audio_transcribed: [
    { value: 'audio.transcript', label: 'Transcript' },
    { value: 'audio.filename', label: 'Filename' },
    { value: 'audio.duration', label: 'Duration (seconds)' },
  ],
  web_change_detected: [
    { value: 'web.url', label: 'URL' },
    { value: 'web.content', label: 'Content' },
    { value: 'web.changeType', label: 'Change Type' },
  ],
};

const OPERATOR_OPTIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'matches', label: 'Matches Regex' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

export function ConditionBuilder({ conditions, onChange, triggerType }: ConditionBuilderProps) {
  const fieldOptions = FIELD_OPTIONS[triggerType] || [];

  const addRule = () => {
    const newRule: ConditionRule = {
      id: `rule_${Date.now()}`,
      field: fieldOptions[0]?.value || '',
      operator: 'contains',
      value: '',
    };

    onChange({
      ...conditions,
      rules: [...conditions.rules, newRule],
    });
  };

  const removeRule = (ruleId: string) => {
    onChange({
      ...conditions,
      rules: conditions.rules.filter(r => r.id !== ruleId),
    });
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionRule>) => {
    onChange({
      ...conditions,
      rules: conditions.rules.map(r => 
        r.id === ruleId ? { ...r, ...updates } : r
      ),
    });
  };

  const toggleGroupType = () => {
    onChange({
      ...conditions,
      type: conditions.type === 'AND' ? 'OR' : 'AND',
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Group Type Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Match</span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleGroupType}
            className="h-7"
          >
            <Badge variant={conditions.type === 'AND' ? 'default' : 'secondary'}>
              {conditions.type}
            </Badge>
          </Button>
          <span className="text-sm text-muted-foreground">of the following conditions:</span>
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {conditions.rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No conditions defined</p>
              <p className="text-xs mt-1">Click "Add Condition" to start building rules</p>
            </div>
          ) : (
            conditions.rules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-2">
                {/* Rule Number */}
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">
                  {index + 1}
                </div>

                {/* Field Selector */}
                <Select
                  value={rule.field}
                  onValueChange={(value) => updateRule(rule.id, { field: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator Selector */}
                <Select
                  value={rule.operator}
                  onValueChange={(value) => updateRule(rule.id, { operator: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value Input */}
                <Input
                  placeholder="Value..."
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                  className="flex-1"
                />

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(rule.id)}
                  className="h-9 w-9"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add Condition Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={addRule}
          className="mt-4 w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </Button>

        {/* Preview */}
        {conditions.rules.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Condition Preview:</p>
            <p className="text-sm font-mono">
              {conditions.rules.map((rule, idx) => (
                <span key={rule.id}>
                  {idx > 0 && <span className="text-blue-600 font-semibold"> {conditions.type} </span>}
                  <span className="text-green-600">{rule.field}</span>
                  {' '}
                  <span className="text-orange-600">{rule.operator}</span>
                  {' '}
                  <span className="text-purple-600">"{rule.value}"</span>
                </span>
              ))}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
