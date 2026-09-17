import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {useThemeConfig} from '@docusaurus/theme-common';
import Logo from '@theme/Logo';
import CollapseButton from '@theme/DocSidebar/Desktop/CollapseButton';
import Content from '@theme/DocSidebar/Desktop/Content';
import styles from './styles.module.css';

export default function DocSidebarDesktop({path, sidebar, onCollapse, isHidden}) {
  const {
    navbar: {hideOnScroll},
    docs: { sidebar: {hideable} },
  } = useThemeConfig();

  // Pure React state
  const [isMini, setIsMini] = useState(false);

  // Sync to global attribute for pure CSS animations
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', isMini ? 'mini' : 'full');
  }, [isMini]);

  const handleToggle = () => {
    setIsMini(!isMini);
  };

  return (
    <div
      className={clsx(
        styles.sidebar,
        hideOnScroll && styles.sidebarWithHideableNavbar,
        isMini && 'my-custom-mini-sidebar'
      )}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMini ? 'center' : 'space-between', padding: '10px 10px 0 10px' }}>
        {hideOnScroll && !isMini && <Logo tabIndex={-1} className={styles.sidebarLogo} />}
        {hideable && (
          <CollapseButton 
            onClick={handleToggle} 
            style={{ transform: isMini ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        )}
      </div>
      <Content path={path} sidebar={sidebar} />
    </div>
  );
}
