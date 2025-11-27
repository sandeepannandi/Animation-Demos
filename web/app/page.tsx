import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <div className={styles.gridItem}>1</div>
        <div className={styles.gridItem}>2</div>
        <div className={styles.gridItem}>3</div>
        <div className={styles.gridItem}>4</div>
        <div className={styles.gridItem}>5</div>
        <div className={styles.gridItem}>6</div>
        <div className={styles.gridItem}>7</div>
        <div className={styles.gridItem}>8</div>
        <div className={styles.gridItem}>9</div>
      </div>
    </main>
  )
}
