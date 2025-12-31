import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  height = '400px'
}) => {
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorDidMount = (monaco: Monaco) => {
    monacoRef.current = monaco;

    // Configure Ruby language support
    monaco.languages.register({ id: 'ruby' });

    // Set Ruby language configuration
    monaco.languages.setLanguageConfiguration('ruby', {
      comments: {
        lineComment: '#',
        blockComment: ['=begin', '=end']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });

    // Set Ruby syntax highlighting
    monaco.languages.setMonarchTokensProvider('ruby', {
      keywords: [
        'class', 'module', 'def', 'end', 'if', 'elsif', 'else', 'unless',
        'case', 'when', 'then', 'while', 'until', 'for', 'break', 'next',
        'return', 'yield', 'super', 'self', 'nil', 'true', 'false',
        'and', 'or', 'not', 'begin', 'rescue', 'ensure', 'retry',
        'puts', 'print', 'p', 'require', 'include', 'extend'
      ],
      operators: [
        '=', '+=', '-=', '*=', '/=', '%=', '**=',
        '==', '!=', '<', '>', '<=', '>=', '<=>',
        '&&', '||', '!', '&', '|', '^', '~',
        '+', '-', '*', '/', '%', '**',
        '<<', '>>', '=~', '!~'
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      tokenizer: {
        root: [
          [/[a-zA-Z_$][\w$]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/[A-Z][\w$]*/, 'type.identifier'],
          [/#.*$/, 'comment'],
          [/".*?"/, 'string'],
          [/'.*?'/, 'string'],
          [/\d+/, 'number'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }]
        ]
      }
    });
  };

  const handleChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
      <div style={{
        background: '#f5f5f5',
        padding: '8px 12px',
        borderBottom: '1px solid #ccc',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        main.rb
      </div>
      <Editor
        height={height}
        language="ruby"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        beforeMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true
        }}
      />
    </div>
  );
};