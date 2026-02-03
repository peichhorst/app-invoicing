import React from 'react';

interface EmailTemplateProps {
  type: 'invoice' | 'proposal' | 'contract';
  title: string;
  total?: number;
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  clientName: string;
  companyName: string;
  pdfUrl?: string;
  customMessage?: string;
  documentNumber?: string;
}

export const EmailTemplate: React.FC<EmailTemplateProps> = ({
  type,
  title,
  total,
  currency = 'USD',
  issueDate,
  dueDate,
  clientName,
  companyName,
  pdfUrl,
  customMessage,
  documentNumber
}) => {
  const docType = type.charAt(0).toUpperCase() + type.slice(1);
  const docLabel = type === 'invoice' ? 'Invoice' : type === 'proposal' ? 'Proposal' : 'Contract';
  
  const formattedTotal = total !== undefined 
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(total)
    : '';
  
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            New {docType} from {companyName}
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: '0'
          }}>
            Sent to: {clientName}
          </p>
        </div>

        {/* Document Info */}
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <span style={{
              fontWeight: '600',
              color: '#374151'
            }}>
              Title:
            </span>
            <span style={{
              color: '#1f2937'
            }}>
              {title}
            </span>
          </div>
          
          {documentNumber && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <span style={{
                fontWeight: '600',
                color: '#374151'
              }}>
                {docLabel} #:
              </span>
              <span style={{
                color: '#1f2937'
              }}>
                {documentNumber}
              </span>
            </div>
          )}
          
          {issueDate && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <span style={{
                fontWeight: '600',
                color: '#374151'
              }}>
                Issue Date:
              </span>
              <span style={{
                color: '#1f2937'
              }}>
                {issueDate}
              </span>
            </div>
          )}
          
          {dueDate && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <span style={{
                fontWeight: '600',
                color: '#374151'
              }}>
                Due Date:
              </span>
              <span style={{
                color: '#1f2937'
              }}>
                {dueDate}
              </span>
            </div>
          )}
          
          {total !== undefined && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <span style={{
                fontWeight: '700',
                fontSize: '18px',
                color: '#111827'
              }}>
                Total:
              </span>
              <span style={{
                fontWeight: '700',
                fontSize: '18px',
                color: '#059669'
              }}>
                {formattedTotal}
              </span>
            </div>
          )}
        </div>

        {/* Custom Message */}
        {customMessage && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#fef3c7',
            borderRadius: '6px',
            borderLeft: '4px solid #f59e0b'
          }}>
            <p style={{
              margin: '0',
              color: '#92400e',
              fontWeight: '500'
            }}>
              {customMessage}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '32px'
        }}>
          {/* Primary Action */}
          <a 
            href={pdfUrl || '#'} 
            style={{
              display: 'block',
              padding: '14px 24px',
              backgroundColor: '#4f46e5',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = '#4338ca';
              target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = '#4f46e5';
              target.style.transform = 'translateY(0)';
            }}
          >
            Download Official {docLabel} PDF
          </a>
          
          {/* Secondary Action */}
          {pdfUrl && (
            <a 
              href={pdfUrl} 
              download
              style={{
                display: 'block',
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                textAlign: 'center',
                border: '1px solid #d1d5db'
              }}
            >
              Save Copy to Your Records
            </a>
          )}
        </div>

        {/* Important Notice */}
        <div style={{
          backgroundColor: '#dbeafe',
          borderRadius: '6px',
          padding: '16px',
          borderLeft: '4px solid #3b82f6',
          marginBottom: '24px'
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#1d4ed8'
          }}>
            Important Notice
          </h3>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            This {type} has been digitally stored and is available for download as a permanent record. 
            The PDF linked above is the official version of this document.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '20px',
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Sent from {companyName}
          </p>
          <p style={{
            margin: '0',
            fontSize: '12px',
            color: '#9ca3af'
          }}>
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplate;