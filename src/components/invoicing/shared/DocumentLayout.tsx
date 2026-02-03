import React from 'react';

interface DocumentLayoutProps {
  children: React.ReactNode;
  documentType?: 'invoice' | 'proposal' | 'contract';
  mode?: 'pdf' | 'print' | 'preview';
}

export default function DocumentLayout(props: DocumentLayoutProps) {
  return (
    <div>
      {/* TODO: Implement document layout wrapper */}
      {props.children}
    </div>
  );
}
