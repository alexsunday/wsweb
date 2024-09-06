
export async function dynamicLoadCss(url: string): Promise<boolean> {
  const head = document.getElementsByTagName('head')[0];
  const link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.href = url;
  head.appendChild(link);
  return new Promise((resolve, reject) => {
    link.onload = evt => {
      // console.log(`load [${url}] event occur`);
      resolve(true);
    };
    link.onerror = err => {
      console.error(`load [${url}] failed!`);
      reject(err);
    };
    return false;
  });
}

export async function dynamicLoadJs(url: string): Promise<boolean> {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  // 如果资源加载失败可以被捕获
  script.crossOrigin = 'anonymous';
  script.type = 'text/javascript';
  script.src = url;
  head.appendChild(script);

  return new Promise((resolve, reject) => {
    script.onload = evt => {
      // console.log(`load [${url}] event occur`);
      resolve(true);
    };
    script.onerror = err => {
      console.error(`load [${url}] failed!`);
      reject(err);
    };
    return false;
  });
}

export async function dynamicLoadJsContent(content: string): Promise<boolean> {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  // 如果资源加载失败可以被捕获
  script.crossOrigin = 'anonymous';
  script.type = 'text/javascript';
  script.innerText = content;
  head.appendChild(script);
  return new Promise((resolve, reject) => {
    script.onload = evt => {
      // console.log(`load [${url}] event occur`);
      resolve(true);
    };
    script.onerror = err => {
      console.error(`load failed!`);
      reject(err);
    };
    return false;
  });
}

export async function dynamicLoadCssContent(content: string): Promise<boolean> {
  const head = document.getElementsByTagName('head')[0];
  const link = document.createElement('style');
  link.innerText = content;
  head.appendChild(link);

  return new Promise((resolve, reject) => {
    link.onload = evt => {
      // console.log(`load [${url}] event occur`);
      resolve(true);
    };
    link.onerror = err => {
      console.error(`load failed!`);
      reject(err);
    };
    return false;
  });
}
