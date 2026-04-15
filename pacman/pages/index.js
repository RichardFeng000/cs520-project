import React from 'react'
import Head from 'next/head'

const Index = () => (
  <>
    <Head>
      <title>Pacman</title>
    </Head>
    <style jsx global>{`
      html,
      body,
      #__next {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    `}</style>
    <iframe
      src='/index.html'
      width='100%'
      height='100%'
      frameBorder='0'
    />
  </>
)

export default Index
