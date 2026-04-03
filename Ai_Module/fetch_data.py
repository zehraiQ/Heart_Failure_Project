import pandas as pd
import sqlite3
# 1. StandardScaler kütüphanesini içe aktarma 
from sklearn.preprocessing import StandardScaler
# Veriyi bölmek için train_test_split'i içe aktarma 
from sklearn.model_selection import train_test_split

# Veritabani yolunu tam olarak belirleme
db_file_path = 'database/HeartFailure_DB.db'

try:
    # 2. Veritabani bağlantisini oluşturma
    conn = sqlite3.connect(db_file_path)
    print("Veritabanina başariyla bağlanildi.")

    # 3. Tüm verileri getirmek için SQL sorgusu yazma
    sql_query = "SELECT * FROM heart_failure_records" 
    
    # 4. Sorguyu çaliştirma ve sonucu DataFrame'e dönüştürme
    df_from_db = pd.read_sql(sql_query, conn)
    print("Veriler başariyla getirildi ve DataFrame'e dönüştürüldü!\n")
    
    # =======================================================
    # --- Eksik Veri (Missing Values) Kontrolü ---
    # =======================================================
    print("--- Eksik Veri (Missing Values) Kontrolü ---")
    missing_values = df_from_db.isnull().sum()
    if missing_values.sum() == 0:
        print("Harika! Veri seti tamamen temiz, eksik değer (null) yok.")
    else:
        print("Eksik değerler bulundu. Temizleniyor...")
        df_from_db = df_from_db.dropna()
        print("Eksik veri içeren satirlar başariyla silindi.")
    
    # =======================================================
    # --- Bağimsiz (X) ve Bağimli (y) Değişkenleri Ayirma ---
    # =======================================================
    print("\n--- Bağimsiz (X) ve Bağimli (y) Değişkenleri Ayirma ---")
    X = df_from_db.drop('DEATH_EVENT', axis=1)
    y = df_from_db['DEATH_EVENT']
    print("Veriler X (Özellikler) ve y (Hedef) olarak başariyla ayrildi.")

    # =======================================================
    # --- Verileri Ölçeklendirme (Data Scaling) ---
    # =======================================================
    print("\n--- Verileri Ölçeklendirme (StandardScaler) ---")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X = pd.DataFrame(X_scaled, columns=X.columns)
    print("Veriler başariyla standartlaştirildi (Ölçeklendirildi).")

    # =======================================================
    # --- Veriyi Eğitim (Train) ve Test Olarak Bölme ---
    # =======================================================
    print("\n--- Veriyi Eğitim (Train) ve Test Olarak Bölme ---")
    
    # Veriyi %80 Eğitim (Train), %20 Test olacak şekilde ayiriyoruz
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Veriler %80 Eğitim ve %20 Test olarak başariyla bölündü.")
    
    # Doğrulama için boyutlari yazdirma
    print(f"Toplam Veri Sayisi: {X.shape[0]} satir")
    print(f"Eğitim Seti (X_train) Sayisi: {X_train.shape[0]} satir")
    print(f"Test Seti (X_test) Sayisi: {X_test.shape[0]} satir")
    # =======================================================

except FileNotFoundError:
    print(f"Hata: Belirtilen yolda veritabani bulunamadi. '{db_file_path}'.")
except Exception as e:
    print(f"Bir hata oluştu: {e}")

finally:
    # 6. Veritabani bağlantisini kapatma
    if 'conn' in locals():
        conn.close()
        print("\nVeritabani bağlantisi kapatildi.")