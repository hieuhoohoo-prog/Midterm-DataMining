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
                rules={[{ required: true, message: `Vui lòng chọn ${field.label.toLowerCase()}` }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder={`Chọn ${field.label.toLowerCase()}`}
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
              rules={[{ required: true, message: `Vui lòng nhập ${field.label.toLowerCase()}` }]}
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
                    : `Nhập ${field.label.toLowerCase()}`
                }
              />
            </Form.Item>
          </Col>
        );
      })}
    </Row>
  );
};

