import { createContext, useContext, useState, type ReactNode } from "react";

interface PageControlsContextType {
  leftContent: ReactNode | null;
  setLeftContent: (content: ReactNode | null) => void;
  rightContent: ReactNode | null;
  setRightContent: (content: ReactNode | null) => void;
}

const PageControlsContext = createContext<PageControlsContextType>({
  leftContent: null,
  setLeftContent: () => {},
  rightContent: null,
  setRightContent: () => {},
});

export function PageControlsProvider({ children }: { children: ReactNode }) {
  const [leftContent, setLeftContent] = useState<ReactNode | null>(null);
  const [rightContent, setRightContent] = useState<ReactNode | null>(null);
  return (
    <PageControlsContext.Provider value={{ leftContent, setLeftContent, rightContent, setRightContent }}>
      {children}
    </PageControlsContext.Provider>
  );
}

export function usePageControls() {
  return useContext(PageControlsContext);
}
