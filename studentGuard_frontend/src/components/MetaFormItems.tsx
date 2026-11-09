import React from 'react';
import { Col, Form, InputNumber, Row, Select } from 'antd';
import { FieldMeta } from '../types';

interface MetaFormItemsProps {
  fields: FieldMeta[];
  colSpan?: number;
}

export const MetaFormItems: React.FC<MetaFormItemsProps> = ({ fields, colSpan = 8 }) => {
  return (
    <Row gutter={[16, 4]}>
      {fields.map((field) => {
        if (field.type === 'binary' || field.type === 'categorical') {
          return (
            <Col xs={24} sm={12} md={colSpan} key={field.name}>
              <Form.Item
                name={field.name}
                label={field.label}
                rules={[{ required: true, message: `Please select ${field.label}` }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={`Select ${field.label}`}
                  options={(field.options || []).map((opt) => ({
                    value: opt.value,
                    label:
                      field.type === 'binary'
                        ? `${opt.label} (${opt.value})`
                        : `${opt.value} – ${opt.label}`,
                  }))}
                />
              </Form.Item>
            </Col>
          );
        }

        const isFloat = field.type === 'float';
        return (
          <Col xs={24} sm={12} md={colSpan} key={field.name}>
            <Form.Item
              name={field.name}
              label={field.label}
              rules={[{ required: true, message: `Please enter ${field.label}` }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={field.min ?? undefined}
                max={field.max ?? undefined}
                step={isFloat ? 0.1 : 1}
                precision={isFloat ? 2 : 0}
                placeholder={
                  field.min != null && field.max != null
                    ? `${field.min} – ${field.max}`
                    : `Enter ${field.label}`
                }
              />
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
};
